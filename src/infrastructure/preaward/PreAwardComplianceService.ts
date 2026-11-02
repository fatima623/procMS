import { AdvertisementMedium } from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';
import { ValidationError, NotFoundError } from '@/domain/errors/DomainError';
import { decimalToMinor } from '@/infrastructure/common/decimal';

/**
 * Pre-award compliance guards derived from PPRA Rules 12, 13 and 26.
 *   - assertAdvertisementCoverage(indentId): refuses an action that proceeds
 *     past IT dispatch when the indent's recorded Advertisement rows do not
 *     cover the thresholds Rule 12 requires.
 *   - assertResponseTime(indentId, closingAt): refuses an IT dispatch whose
 *     closingAt - publishedOn is less than Rule 13 requires (15 days NCB,
 *     45 days ICB).
 *   - overdueBidValidityOffers / bidValidityStatus: utility reads for the
 *     UI and reporting layer.
 */
export const preAwardCompliance = {
  async assertAdvertisementCoverage(indentId: string): Promise<void> {
    const indent = await prisma.indent.findUnique({
      where: { id: indentId },
      select: {
        id: true,
        estimatedValue: true,
        advertisements: { select: { medium: true, publishedOn: true } },
      },
    });
    if (!indent) throw new NotFoundError('Indent', indentId);
    const valueMinor = decimalToMinor(indent.estimatedValue);
    const r12WebsiteThreshold = 500_000n * 10_000n;      // > 500k → PPRA website
    const r12NewspaperThreshold = 3_000_000n * 10_000n;  // > 3M   → newspaper AS WELL

    if (valueMinor <= r12WebsiteThreshold) return; // no rule applies

    const mediums = new Set(indent.advertisements.map((a) => a.medium));
    const hasWebsite =
      mediums.has(AdvertisementMedium.PPRA_WEBSITE) || mediums.has(AdvertisementMedium.EPADS);
    if (!hasWebsite) {
      throw new ValidationError(
        'PPRA Rule 12(1): procurement > PKR 500,000 must be advertised on the PPRA website (or EPADS). No such Advertisement row exists.',
      );
    }
    if (valueMinor > r12NewspaperThreshold) {
      const hasNewspaper = mediums.has(AdvertisementMedium.NEWSPAPER);
      if (!hasNewspaper) {
        throw new ValidationError(
          'PPRA Rule 12(2): procurement > PKR 3,000,000 must also be advertised in at least one widely-circulated newspaper. No NEWSPAPER Advertisement row exists.',
        );
      }
    }
  },

  async assertResponseTime(indentId: string, closingAt: Date): Promise<void> {
    const indent = await prisma.indent.findUnique({
      where: { id: indentId },
      select: {
        id: true,
        isInternational: true,
        advertisements: {
          orderBy: { publishedOn: 'asc' },
          select: { publishedOn: true },
          take: 1,
        },
      },
    });
    if (!indent) throw new NotFoundError('Indent', indentId);
    const earliest = indent.advertisements[0]?.publishedOn;
    if (!earliest) {
      // No advertisement recorded yet — skip response-time check (A7 catches that).
      return;
    }
    const minDays = indent.isInternational ? 45 : 15;
    const diffMs = closingAt.getTime() - earliest.getTime();
    const diffDays = Math.floor(diffMs / 86_400_000);
    if (diffDays < minDays) {
      throw new ValidationError(
        `PPRA Rule 13: minimum response time is ${minDays} days (${indent.isInternational ? 'ICB' : 'NCB'}). The gap between the first advertisement (${earliest.toISOString().slice(0, 10)}) and closing (${closingAt.toISOString().slice(0, 10)}) is only ${diffDays} days.`,
      );
    }
  },

  /**
   * Commercial offers whose bid validity has lapsed. These need an extension
   * (if PPRA Rule 26 (3) applies) or must be excluded from the CST.
   */
  async overdueBidValidityOffers(): Promise<readonly {
    readonly id: string;
    readonly firmId: string;
    readonly itPerformaId: string;
    readonly validUntil: string;
    readonly totalPriceMinor: string;
    readonly currency: string;
  }[]> {
    const now = new Date();
    const rows = await prisma.commercialOffer.findMany({
      where: { bidValidUntil: { lt: now }, status: { in: ['RECEIVED', 'UNDER_REVIEW', 'ACCEPTED'] } },
      select: { id: true, firmId: true, itPerformaId: true, bidValidUntil: true, totalPrice: true, currency: true },
    });
    return rows
      .filter((r) => r.bidValidUntil)
      .map((r) => ({
        id: r.id,
        firmId: r.firmId,
        itPerformaId: r.itPerformaId,
        validUntil: r.bidValidUntil!.toISOString(),
        totalPriceMinor: decimalToMinor(r.totalPrice).toString(),
        currency: r.currency,
      }));
  },
};
