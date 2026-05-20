/**
 * Curated bin catalog for Sorted w/ Gridfinity.
 *
 * Standard bins + specialty bins from MakerWorld collections.
 * Sizes are in 21mm grid base units (2 cells = 1 Gridfinity unit = 42mm).
 */

export interface CatalogBin {
  id: string;
  name: string;
  /** Width in 21mm grid cells */
  widthCells: number;
  /** Depth in 21mm grid cells */
  depthCells: number;
  /** Category for grouping */
  category: 'standard' | 'workshop' | 'kitchen' | 'office' | 'electronics';
  /** Short description */
  description?: string;
  /** MakerWorld model URL (for reference/printing) */
  makerWorldUrl?: string;
}

// ============================================================
// STANDARD PLAIN BINS — all common sizes
// ============================================================
const standardBins: CatalogBin[] = [
  // 1-unit wide
  { id: 'std-1x1', name: '1×1', widthCells: 2, depthCells: 2, category: 'standard', description: '42×42mm' },
  { id: 'std-2x1', name: '2×1', widthCells: 4, depthCells: 2, category: 'standard', description: '84×42mm' },
  { id: 'std-3x1', name: '3×1', widthCells: 6, depthCells: 2, category: 'standard', description: '126×42mm' },
  { id: 'std-4x1', name: '4×1', widthCells: 8, depthCells: 2, category: 'standard', description: '168×42mm' },
  { id: 'std-5x1', name: '5×1', widthCells: 10, depthCells: 2, category: 'standard', description: '210×42mm' },
  { id: 'std-6x1', name: '6×1', widthCells: 12, depthCells: 2, category: 'standard', description: '252×42mm' },
  // 2-units deep
  { id: 'std-1x2', name: '1×2', widthCells: 2, depthCells: 4, category: 'standard', description: '42×84mm' },
  { id: 'std-2x2', name: '2×2', widthCells: 4, depthCells: 4, category: 'standard', description: '84×84mm' },
  { id: 'std-3x2', name: '3×2', widthCells: 6, depthCells: 4, category: 'standard', description: '126×84mm' },
  { id: 'std-4x2', name: '4×2', widthCells: 8, depthCells: 4, category: 'standard', description: '168×84mm' },
  { id: 'std-5x2', name: '5×2', widthCells: 10, depthCells: 4, category: 'standard', description: '210×84mm' },
  { id: 'std-6x2', name: '6×2', widthCells: 12, depthCells: 4, category: 'standard', description: '252×84mm' },
  // 3-units deep
  { id: 'std-1x3', name: '1×3', widthCells: 2, depthCells: 6, category: 'standard', description: '42×126mm' },
  { id: 'std-2x3', name: '2×3', widthCells: 4, depthCells: 6, category: 'standard', description: '84×126mm' },
  { id: 'std-3x3', name: '3×3', widthCells: 6, depthCells: 6, category: 'standard', description: '126×126mm' },
  { id: 'std-4x3', name: '4×3', widthCells: 8, depthCells: 6, category: 'standard', description: '168×126mm' },
  { id: 'std-5x3', name: '5×3', widthCells: 10, depthCells: 6, category: 'standard', description: '210×126mm' },
  { id: 'std-6x3', name: '6×3', widthCells: 12, depthCells: 6, category: 'standard', description: '252×126mm' },
  // 4-units deep
  { id: 'std-1x4', name: '1×4', widthCells: 2, depthCells: 8, category: 'standard', description: '42×168mm' },
  { id: 'std-2x4', name: '2×4', widthCells: 4, depthCells: 8, category: 'standard', description: '84×168mm' },
  { id: 'std-3x4', name: '3×4', widthCells: 6, depthCells: 8, category: 'standard', description: '126×168mm' },
  { id: 'std-4x4', name: '4×4', widthCells: 8, depthCells: 8, category: 'standard', description: '168×168mm' },
  { id: 'std-5x4', name: '5×4', widthCells: 10, depthCells: 8, category: 'standard', description: '210×168mm' },
  { id: 'std-6x4', name: '6×4', widthCells: 12, depthCells: 8, category: 'standard', description: '252×168mm' },
  // 5-units deep
  { id: 'std-2x5', name: '2×5', widthCells: 4, depthCells: 10, category: 'standard', description: '84×210mm' },
  { id: 'std-3x5', name: '3×5', widthCells: 6, depthCells: 10, category: 'standard', description: '126×210mm' },
  { id: 'std-4x5', name: '4×5', widthCells: 8, depthCells: 10, category: 'standard', description: '168×210mm' },
  { id: 'std-5x5', name: '5×5', widthCells: 10, depthCells: 10, category: 'standard', description: '210×210mm' },
  // 6-units deep
  { id: 'std-3x6', name: '3×6', widthCells: 6, depthCells: 12, category: 'standard', description: '126×252mm' },
  { id: 'std-4x6', name: '4×6', widthCells: 8, depthCells: 12, category: 'standard', description: '168×252mm' },
  { id: 'std-6x6', name: '6×6', widthCells: 12, depthCells: 12, category: 'standard', description: '252×252mm' },
];

// ============================================================
// WORKSHOP / TOOL BINS
// ============================================================
const workshopBins: CatalogBin[] = [
  { id: 'ws-screwdriver-1x3', name: 'Screwdriver Holder', widthCells: 2, depthCells: 6, category: 'workshop', description: '1×3 — holds 2-3 screwdrivers upright' },
  { id: 'ws-screwdriver-1x4', name: 'Screwdriver Holder (Tall)', widthCells: 2, depthCells: 8, category: 'workshop', description: '1×4 — holds longer screwdrivers' },
  { id: 'ws-pliers-2x4', name: 'Pliers Cradle', widthCells: 4, depthCells: 8, category: 'workshop', description: '2×4 — angled slots for pliers/cutters' },
  { id: 'ws-pliers-2x3', name: 'Pliers Cradle (Short)', widthCells: 4, depthCells: 6, category: 'workshop', description: '2×3 — fits needle-nose and small pliers' },
  { id: 'ws-hex-key-1x3', name: 'Hex Key Holder', widthCells: 2, depthCells: 6, category: 'workshop', description: '1×3 — slots for Allen key set' },
  { id: 'ws-bit-holder-2x2', name: 'Bit Holder Grid', widthCells: 4, depthCells: 4, category: 'workshop', description: '2×2 — 25-slot grid for drill/driver bits' },
  { id: 'ws-bit-holder-3x2', name: 'Bit Holder Grid (Large)', widthCells: 6, depthCells: 4, category: 'workshop', description: '3×2 — 36-slot grid for bits' },
  { id: 'ws-knife-1x3', name: 'Utility Knife Holder', widthCells: 2, depthCells: 6, category: 'workshop', description: '1×3 — slot for box cutter/X-Acto' },
  { id: 'ws-scissors-2x3', name: 'Scissors Holder', widthCells: 4, depthCells: 6, category: 'workshop', description: '2×3 — cradle for scissors' },
  { id: 'ws-tape-2x2', name: 'Tape Roll Holder', widthCells: 4, depthCells: 4, category: 'workshop', description: '2×2 — holds electrical/masking tape roll' },
  { id: 'ws-glue-1x2', name: 'Glue Bottle Holder', widthCells: 2, depthCells: 4, category: 'workshop', description: '1×2 — round cutout for glue bottles' },
  { id: 'ws-glue-2x2', name: 'Glue Bottle Holder (Double)', widthCells: 4, depthCells: 4, category: 'workshop', description: '2×2 — holds 2 bottles side by side' },
  { id: 'ws-solder-1x4', name: 'Soldering Iron Holder', widthCells: 2, depthCells: 8, category: 'workshop', description: '1×4 — cradle for soldering iron' },
  { id: 'ws-wrench-1x4', name: 'Wrench Holder', widthCells: 2, depthCells: 8, category: 'workshop', description: '1×4 — slot for combination wrench' },
  { id: 'ws-cable-tie-2x2', name: 'Cable Tie Dispenser', widthCells: 4, depthCells: 4, category: 'workshop', description: '2×2 — pull-through cable tie holder' },
  { id: 'ws-parts-4div-2x2', name: '4-Compartment Divider', widthCells: 4, depthCells: 4, category: 'workshop', description: '2×2 — split into 4 equal sections' },
  { id: 'ws-parts-6div-3x2', name: '6-Compartment Divider', widthCells: 6, depthCells: 4, category: 'workshop', description: '3×2 — split into 6 sections' },
  { id: 'ws-parts-6div-3x3', name: '6-Compartment (3×3)', widthCells: 6, depthCells: 6, category: 'workshop', description: '3×3 — 6 compartments, mixed sizes' },
  { id: 'ws-parts-9div-3x3', name: '9-Compartment Divider', widthCells: 6, depthCells: 6, category: 'workshop', description: '3×3 — split into 9 equal sections' },
  { id: 'ws-parts-4div-4x3', name: '4-Compartment (4×3)', widthCells: 8, depthCells: 6, category: 'workshop', description: '4×3 — 4 large compartments' },
  { id: 'ws-parts-6div-4x3', name: '6-Compartment (4×3)', widthCells: 8, depthCells: 6, category: 'workshop', description: '4×3 — 6 compartments' },
  { id: 'ws-parts-8div-4x3', name: '8-Compartment (4×3)', widthCells: 8, depthCells: 6, category: 'workshop', description: '4×3 — 8 compartments' },
  { id: 'ws-parts-div-5x5', name: 'Multi-Compartment (5×5)', widthCells: 10, depthCells: 10, category: 'workshop', description: '5×5 — large multi-section organizer' },
  { id: 'ws-spool-2x2', name: 'Solder Spool Holder', widthCells: 4, depthCells: 4, category: 'workshop', description: '2×2 — holds solder/wire spool' },
  { id: 'ws-multimeter-3x4', name: 'Multimeter Holder', widthCells: 6, depthCells: 8, category: 'workshop', description: '3×4 — cradle for handheld multimeter' },
];

// ============================================================
// KITCHEN / HOUSEHOLD BINS
// ============================================================
const kitchenBins: CatalogBin[] = [
  { id: 'kt-foil-3x2', name: 'Foil/Wrap Dispenser', widthCells: 6, depthCells: 4, category: 'kitchen', description: '3×2 — holds foil/cling wrap box' },
  { id: 'kt-foil-4x2', name: 'Foil/Wrap Dispenser (Large)', widthCells: 8, depthCells: 4, category: 'kitchen', description: '4×2 — holds larger wrap boxes' },
  { id: 'kt-sandwich-bag-3x2', name: 'Sandwich Bag Holder', widthCells: 6, depthCells: 4, category: 'kitchen', description: '3×2 — holds bag box upright' },
  { id: 'kt-ziplock-3x3', name: 'Ziplock Bag Holder', widthCells: 6, depthCells: 6, category: 'kitchen', description: '3×3 — holds gallon bag box' },
  { id: 'kt-spice-1x2', name: 'Spice Jar Holder', widthCells: 2, depthCells: 4, category: 'kitchen', description: '1×2 — single spice jar slot' },
  { id: 'kt-spice-3x2', name: 'Spice Jar Rack (3)', widthCells: 6, depthCells: 4, category: 'kitchen', description: '3×2 — holds 3 spice jars' },
  { id: 'kt-utensil-1x4', name: 'Utensil Slot', widthCells: 2, depthCells: 8, category: 'kitchen', description: '1×4 — single utensil (spatula, spoon)' },
  { id: 'kt-utensil-2x4', name: 'Utensil Holder (Wide)', widthCells: 4, depthCells: 8, category: 'kitchen', description: '2×4 — holds 2-3 utensils' },
  { id: 'kt-knife-1x5', name: 'Kitchen Knife Slot', widthCells: 2, depthCells: 10, category: 'kitchen', description: '1×5 — single knife slot' },
  { id: 'kt-bottle-2x2', name: 'Sauce Bottle Holder', widthCells: 4, depthCells: 4, category: 'kitchen', description: '2×2 — round cutout for bottles' },
];

// ============================================================
// OFFICE / DESK BINS
// ============================================================
const officeBins: CatalogBin[] = [
  { id: 'of-pen-1x2', name: 'Pen/Pencil Holder', widthCells: 2, depthCells: 4, category: 'office', description: '1×2 — holds 4-6 pens upright' },
  { id: 'of-pen-2x2', name: 'Pen Cup (Large)', widthCells: 4, depthCells: 4, category: 'office', description: '2×2 — holds markers and pens' },
  { id: 'of-marker-1x3', name: 'Marker Holder', widthCells: 2, depthCells: 6, category: 'office', description: '1×3 — holds thick markers upright' },
  { id: 'of-sd-card-1x1', name: 'SD Card Holder', widthCells: 2, depthCells: 2, category: 'office', description: '1×1 — slots for SD/micro-SD cards' },
  { id: 'of-usb-2x1', name: 'USB Drive Holder', widthCells: 4, depthCells: 2, category: 'office', description: '2×1 — slots for USB sticks' },
  { id: 'of-sticky-3x3', name: 'Sticky Note Holder', widthCells: 6, depthCells: 6, category: 'office', description: '3×3 — holds standard sticky note pad' },
  { id: 'of-paperclip-1x1', name: 'Paper Clip Tray', widthCells: 2, depthCells: 2, category: 'office', description: '1×1 — small parts tray' },
  { id: 'of-stapler-2x3', name: 'Stapler Holder', widthCells: 4, depthCells: 6, category: 'office', description: '2×3 — cradle for desktop stapler' },
  { id: 'of-phone-2x4', name: 'Phone Stand', widthCells: 4, depthCells: 8, category: 'office', description: '2×4 — angled phone dock' },
];

// ============================================================
// ELECTRONICS BINS
// ============================================================
const electronicsBins: CatalogBin[] = [
  { id: 'el-battery-aa-2x2', name: 'AA Battery Holder', widthCells: 4, depthCells: 4, category: 'electronics', description: '2×2 — holds 12+ AA batteries' },
  { id: 'el-battery-aaa-2x1', name: 'AAA Battery Holder', widthCells: 4, depthCells: 2, category: 'electronics', description: '2×1 — holds 10+ AAA batteries' },
  { id: 'el-battery-9v-1x2', name: '9V Battery Holder', widthCells: 2, depthCells: 4, category: 'electronics', description: '1×2 — holds 4 9V batteries' },
  { id: 'el-resistor-3x2', name: 'Resistor Organizer', widthCells: 6, depthCells: 4, category: 'electronics', description: '3×2 — labeled compartments for resistors' },
  { id: 'el-led-2x2', name: 'LED Organizer', widthCells: 4, depthCells: 4, category: 'electronics', description: '2×2 — sorted slots for LEDs' },
  { id: 'el-arduino-3x3', name: 'Arduino/MCU Holder', widthCells: 6, depthCells: 6, category: 'electronics', description: '3×3 — cradle for dev boards' },
  { id: 'el-connector-2x2', name: 'Connector Bin', widthCells: 4, depthCells: 4, category: 'electronics', description: '2×2 — divided for JST/Dupont connectors' },
  { id: 'el-wire-spool-2x2', name: 'Wire Spool Holder', widthCells: 4, depthCells: 4, category: 'electronics', description: '2×2 — holds small wire spools' },
];

/** Full catalog */
export const BIN_CATALOG: CatalogBin[] = [
  ...standardBins,
  ...workshopBins,
  ...kitchenBins,
  ...officeBins,
  ...electronicsBins,
];

/** Get bins by category */
export function getStandardBins(): CatalogBin[] {
  return standardBins;
}

export function getWorkshopBins(): CatalogBin[] {
  return workshopBins;
}

export function getKitchenBins(): CatalogBin[] {
  return kitchenBins;
}

export function getOfficeBins(): CatalogBin[] {
  return officeBins;
}

export function getElectronicsBins(): CatalogBin[] {
  return electronicsBins;
}

export type BinCategory = CatalogBin['category'];

export function getBinsByCategory(category: BinCategory): CatalogBin[] {
  return BIN_CATALOG.filter(b => b.category === category);
}
