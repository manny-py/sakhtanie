import { z } from "zod";

import {
  sponsorSchema,
  type Sponsor,
  type SponsorDefinition,
} from "./sponsors";

export const SPONSOR_SURFACES = [
  "desktop-left",
  "desktop-right",
  "mobile-top",
  "mobile-bottom",
] as const;

export type SponsorSurface = (typeof SPONSOR_SURFACES)[number];

export const GLOBAL_SPONSOR_PLACEMENT_IDS = [
  "desktop-left-1",
  "desktop-left-2",
  "desktop-left-3",
  "desktop-left-4",
  "desktop-left-5",
  "desktop-right-1",
  "desktop-right-2",
  "desktop-right-3",
  "desktop-right-4",
  "desktop-right-5",
  "mobile-top-1",
  "mobile-top-2",
  "mobile-top-3",
  "mobile-top-4",
  "mobile-top-5",
  "mobile-bottom-1",
  "mobile-bottom-2",
  "mobile-bottom-3",
  "mobile-bottom-4",
  "mobile-bottom-5",
] as const;

export type GlobalSponsorPlacementId =
  (typeof GLOBAL_SPONSOR_PLACEMENT_IDS)[number];

export type SponsorCampaign = Sponsor;

export type SponsorPlacement = Readonly<{
  id: GlobalSponsorPlacementId;
  campaignId: string | null;
}>;

export type ResolvedSponsorPlacement = Readonly<{
  placement: SponsorPlacement;
  campaign: Sponsor | null;
  active: boolean;
}>;

export type GlobalSponsorInventory = Readonly<{
  campaigns: Readonly<Record<string, Sponsor>>;
  placements: readonly SponsorPlacement[];
}>;

type SponsorPlacementDefinition = Readonly<{
  id: string;
  campaignId: string | null;
}>;

type GlobalSponsorInventoryDefinition = Readonly<{
  campaigns: readonly SponsorDefinition[];
  placements: readonly SponsorPlacementDefinition[];
}>;

const globalPlacementIdSchema = z.enum(GLOBAL_SPONSOR_PLACEMENT_IDS);
const sponsorPlacementSchema = z
  .object({
    id: globalPlacementIdSchema,
    campaignId: z.string().min(1).max(80).nullable(),
  })
  .strict();

const canonicalPlacementIdSet = new Set<string>(
  GLOBAL_SPONSOR_PLACEMENT_IDS
);

function placementSurface(id: GlobalSponsorPlacementId): SponsorSurface {
  if (id.startsWith("desktop-left-")) return "desktop-left";
  if (id.startsWith("desktop-right-")) return "desktop-right";
  if (id.startsWith("mobile-top-")) return "mobile-top";
  return "mobile-bottom";
}

function assertCanonicalPlacementInventory(
  placements: readonly SponsorPlacement[]
) {
  const seen = new Set<GlobalSponsorPlacementId>();

  for (const placement of placements) {
    if (seen.has(placement.id)) {
      throw new Error(`Duplicate global sponsor placement: ${placement.id}`);
    }

    seen.add(placement.id);
  }

  for (const id of GLOBAL_SPONSOR_PLACEMENT_IDS) {
    if (!seen.has(id)) {
      throw new Error(`Missing canonical global sponsor placement: ${id}`);
    }
  }

  if (placements.length !== GLOBAL_SPONSOR_PLACEMENT_IDS.length) {
    throw new Error(
      `Global sponsor inventory must contain exactly ${GLOBAL_SPONSOR_PLACEMENT_IDS.length} placements`
    );
  }

  for (const surface of SPONSOR_SURFACES) {
    const surfacePlacements = placements.filter(
      (placement) => placementSurface(placement.id) === surface
    );

    if (surfacePlacements.length !== 5) {
      throw new Error(
        `Global sponsor surface ${surface} must contain exactly 5 placements`
      );
    }
  }
}

function orderPlacements(
  placements: readonly SponsorPlacement[]
): readonly SponsorPlacement[] {
  const byId = new Map(
    placements.map((placement) => [placement.id, placement] as const)
  );

  return Object.freeze(
    GLOBAL_SPONSOR_PLACEMENT_IDS.map((id) => byId.get(id)!)
  );
}

export function defineGlobalSponsorInventory(
  definition: GlobalSponsorInventoryDefinition
): GlobalSponsorInventory {
  const campaignEntries = definition.campaigns.map((campaignDefinition) => {
    const campaign = sponsorSchema.parse(campaignDefinition);
    return [campaign.id, Object.freeze(campaign)] as const;
  });
  const campaignIds = new Set<string>();

  for (const [campaignId] of campaignEntries) {
    if (campaignIds.has(campaignId)) {
      throw new Error(`Duplicate sponsor campaign: ${campaignId}`);
    }

    campaignIds.add(campaignId);
  }

  const placements = definition.placements.map((placementDefinition) =>
    Object.freeze(sponsorPlacementSchema.parse(placementDefinition))
  );

  assertCanonicalPlacementInventory(placements);

  for (const placement of placements) {
    if (
      placement.campaignId !== null &&
      !campaignIds.has(placement.campaignId)
    ) {
      throw new Error(
        `Unknown sponsor campaign ${placement.campaignId} for placement ${placement.id}`
      );
    }
  }

  return Object.freeze({
    campaigns: Object.freeze(Object.fromEntries(campaignEntries)),
    placements: orderPlacements(placements),
  });
}

const unassignedGlobalPlacements = GLOBAL_SPONSOR_PLACEMENT_IDS.map((id) => ({
  id,
  campaignId: null,
})) satisfies readonly SponsorPlacement[];

export const globalSponsorInventory = defineGlobalSponsorInventory({
  campaigns: [],
  placements: unassignedGlobalPlacements,
});

export function getGlobalSponsorPlacements(
  surface: SponsorSurface,
  inventory: GlobalSponsorInventory = globalSponsorInventory
): readonly SponsorPlacement[] {
  return inventory.placements.filter(
    (placement) => placementSurface(placement.id) === surface
  );
}

export function resolveGlobalSponsorPlacement(
  id: GlobalSponsorPlacementId,
  inventory: GlobalSponsorInventory = globalSponsorInventory
): ResolvedSponsorPlacement {
  if (!canonicalPlacementIdSet.has(id)) {
    throw new Error(`Unknown global sponsor placement: ${id}`);
  }

  const placement = inventory.placements.find((candidate) => candidate.id === id);

  if (!placement) {
    throw new Error(`Global sponsor placement is not configured: ${id}`);
  }

  const campaign = placement.campaignId
    ? inventory.campaigns[placement.campaignId] ?? null
    : null;

  return Object.freeze({
    placement,
    campaign,
    active: campaign?.active === true,
  });
}

/*
 * Global sponsor analytics identify inventory, not campaign creative:
 * sponsor_impression/sponsor_click payloads use sponsor_id = placement.id.
 * Campaign grouping remains version-controlled configuration metadata.
 */
