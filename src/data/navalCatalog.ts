/**
 * Realm of Crowns - Naval & Maritime Catalog
 * Grounded in Sea Dogs II / Corsairs naval traditions and historical Caribbean seamanship.
 * Includes all 11 ship classes (Tartane to Man-of-War), 4 ammunition types,
 * maritime trade commodities, and archipelago island havens.
 */

export interface ShipClassSpec {
  id: string;
  name: string;
  rank: number; // Rank 7 (weakest, tartane) down to Rank 1 (man-of-war)
  category: 'Fore-and-aft' | 'Brigantine' | 'Square-rigger' | 'Warship' | 'Capital Ship' | 'Eastern War Junk' | 'Eastern Capital Ship' | 'Rowed Hybrid' | 'Raider';
  hull: number;
  sails: number;
  maxCrew: number;
  minCrew: number;
  cannons: number;
  maxCaliber: number; // 8, 12, 16, 20, 24, 32, 36 pounders
  cargo: number;
  baseSpeed: number; // Knots
  turnRate: number; // Degrees/sec
  price: number; // Gold doubloons
  description: string;
}

export const SHIP_CLASSES: Record<string, ShipClassSpec> = {
  tartane: {
    id: 'tartane',
    name: 'Tartane',
    rank: 7,
    category: 'Fore-and-aft',
    hull: 250,
    sails: 100,
    maxCrew: 15,
    minCrew: 3,
    cannons: 4,
    maxCaliber: 8,
    cargo: 250,
    baseSpeed: 11.0,
    turnRate: 30.0,
    price: 1500,
    description: 'Light single-masted coastal craft. Nimble in shallow lagoons, but fragile in open sea cannonades.',
  },
  lugger: {
    id: 'lugger',
    name: 'Lugger',
    rank: 7,
    category: 'Fore-and-aft',
    hull: 450,
    sails: 150,
    maxCrew: 40,
    minCrew: 8,
    cannons: 8,
    maxCaliber: 12,
    cargo: 600,
    baseSpeed: 12.5,
    turnRate: 28.0,
    price: 5000,
    description: 'Swift lug-sail craft favored by coastal smugglers for outrunning naval revenue cutters.',
  },
  sloop: {
    id: 'sloop',
    name: 'Sloop-of-War',
    rank: 6,
    category: 'Fore-and-aft',
    hull: 700,
    sails: 200,
    maxCrew: 70,
    minCrew: 12,
    cannons: 12,
    maxCaliber: 12,
    cargo: 900,
    baseSpeed: 13.0,
    turnRate: 26.0,
    price: 9500,
    description: 'Versatile Caribbean pirate favorite. Extraordinary speed upwind and punchy 12-gun broadside.',
  },
  schooner: {
    id: 'schooner',
    name: 'War Schooner',
    rank: 6,
    category: 'Fore-and-aft',
    hull: 850,
    sails: 240,
    maxCrew: 90,
    minCrew: 15,
    cannons: 16,
    maxCaliber: 16,
    cargo: 1300,
    baseSpeed: 13.5,
    turnRate: 24.0,
    price: 14000,
    description: 'Rakes through wind with twin gaff-rigged masts. Deadly pursuit vessel against merchantmen.',
  },
  barque: {
    id: 'barque',
    name: 'Trade Barque',
    rank: 5,
    category: 'Brigantine',
    hull: 1100,
    sails: 300,
    maxCrew: 110,
    minCrew: 20,
    cannons: 20,
    maxCaliber: 16,
    cargo: 2000,
    baseSpeed: 11.5,
    turnRate: 20.0,
    price: 21000,
    description: 'Sturdy three-masted ocean cruiser with spacious cargo holds for transatlantic spice and rum voyages.',
  },
  brig: {
    id: 'brig',
    name: 'Brigantine',
    rank: 5,
    category: 'Brigantine',
    hull: 1400,
    sails: 350,
    maxCrew: 150,
    minCrew: 25,
    cannons: 24,
    maxCaliber: 20,
    cargo: 2400,
    baseSpeed: 12.0,
    turnRate: 19.0,
    price: 32000,
    description: 'Square-rigged foremast and schooner mainmast. Superb balance of firepower, speed, and durability.',
  },
  galleon: {
    id: 'galleon',
    name: 'Royal Galleon',
    rank: 4,
    category: 'Square-rigger',
    hull: 2200,
    sails: 450,
    maxCrew: 250,
    minCrew: 40,
    cannons: 32,
    maxCaliber: 24,
    cargo: 4500,
    baseSpeed: 9.5,
    turnRate: 13.0,
    price: 55000,
    description: 'Towering multi-deck flagship with fortified forecastle and stern gallery. Heavy 24-pounder broadsides.',
  },
  corvette: {
    id: 'corvette',
    name: 'Naval Corvette',
    rank: 3,
    category: 'Warship',
    hull: 2000,
    sails: 480,
    maxCrew: 280,
    minCrew: 45,
    cannons: 40,
    maxCaliber: 24,
    cargo: 3200,
    baseSpeed: 12.8,
    turnRate: 17.0,
    price: 75000,
    description: 'Flush-deck warship prioritizing speed and devastating raking broadsides over heavy armor.',
  },
  frigate: {
    id: 'frigate',
    name: 'Heavy Frigate',
    rank: 2,
    category: 'Warship',
    hull: 3000,
    sails: 600,
    maxCrew: 400,
    minCrew: 60,
    cannons: 48,
    maxCaliber: 32,
    cargo: 4000,
    baseSpeed: 12.2,
    turnRate: 15.0,
    price: 120000,
    description: 'Queen of the high seas. Combines heavy 32-pounder armament with remarkable ocean seaworthiness.',
  },
  battleship: {
    id: 'battleship',
    name: 'Ship of the Line',
    rank: 1,
    category: 'Capital Ship',
    hull: 4200,
    sails: 750,
    maxCrew: 550,
    minCrew: 90,
    cannons: 64,
    maxCaliber: 32,
    cargo: 5000,
    baseSpeed: 10.5,
    turnRate: 11.0,
    price: 220000,
    description: 'Two full covered gun decks capable of reducing stone coastal fortresses to smoking rubble.',
  },
  manowar: {
    id: 'manowar',
    name: 'First-Rate Man-of-War',
    rank: 1,
    category: 'Capital Ship',
    hull: 5500,
    sails: 900,
    maxCrew: 700,
    minCrew: 120,
    cannons: 92,
    maxCaliber: 36,
    cargo: 6000,
    baseSpeed: 9.8,
    turnRate: 9.0,
    price: 400000,
    description: 'Immense floating citadel mounting 92 heavy guns. Master of the ocean and king of maritime empires.',
  },
  dragon_junk: {
    id: 'dragon_junk',
    name: 'Dragon War Junk',
    rank: 3,
    category: 'Eastern War Junk',
    hull: 2600,
    sails: 420,
    maxCrew: 320,
    minCrew: 45,
    cannons: 36,
    maxCaliber: 24,
    cargo: 3800,
    baseSpeed: 11.5,
    turnRate: 18.0,
    price: 85000,
    description: 'Feared Eastern naval warship with battened ribbed lug sails, tiered pagoda sterncastle, rowing sweep oars, and a carved Golden Imperial Dragon prow.',
  },
  treasure_junk: {
    id: 'treasure_junk',
    name: 'Imperial Treasure Ship',
    rank: 2,
    category: 'Eastern Capital Ship',
    hull: 3800,
    sails: 500,
    maxCrew: 450,
    minCrew: 60,
    cannons: 44,
    maxCaliber: 32,
    cargo: 6500,
    baseSpeed: 10.0,
    turnRate: 13.0,
    price: 160000,
    description: 'Colossal Asian merchant flagship boasting massive watertight cargo holds, red-and-gold fan sails, and auxiliary rowing sweeps.',
  },
  galleass: {
    id: 'galleass',
    name: 'War Galleass',
    rank: 4,
    category: 'Rowed Hybrid',
    hull: 2100,
    sails: 380,
    maxCrew: 340,
    minCrew: 50,
    cannons: 28,
    maxCaliber: 24,
    cargo: 2200,
    baseSpeed: 12.2,
    turnRate: 20.0,
    price: 68000,
    description: 'Mediterranean galley-galleon hybrid. Banks of powerful sweep oars allow high speed against headwinds and ferocious ramming assaults.',
  },
  pirate_corsair: {
    id: 'pirate_corsair',
    name: 'Black Skull Corsair',
    rank: 3,
    category: 'Raider',
    hull: 2400,
    sails: 460,
    maxCrew: 320,
    minCrew: 40,
    cannons: 38,
    maxCaliber: 24,
    cargo: 3500,
    baseSpeed: 13.0,
    turnRate: 18.5,
    price: 90000,
    description: 'Notorious pirate flagship equipped with an iron ramming prow, horned demon figurehead, and reinforced broadsides.',
  },
};

export interface AmmoSpec {
  id: 'balls' | 'knippels' | 'grapeshot' | 'bombs';
  name: string;
  hullDamage: number; // Multiplier
  sailDamage: number;
  crewDamage: number;
  rangeMultiplier: number;
  speed: number;
  color: string;
  cost: number;
  description: string;
}

export const AMMO_TYPES: Record<string, AmmoSpec> = {
  balls: {
    id: 'balls',
    name: 'Round Shot',
    hullDamage: 1.0,
    sailDamage: 0.25,
    crewDamage: 0.15,
    rangeMultiplier: 1.0,
    speed: 55,
    color: '#334155',
    cost: 2,
    description: 'Heavy solid iron spheres designed to shatter thick oak hulls below the waterline.',
  },
  knippels: {
    id: 'knippels',
    name: 'Chain Shot',
    hullDamage: 0.15,
    sailDamage: 1.4,
    crewDamage: 0.10,
    rangeMultiplier: 0.85,
    speed: 46,
    color: '#64748b',
    cost: 4,
    description: 'Twin iron balls linked by a chain. Whirling blades that shred rigging and topple mainmasts.',
  },
  grapeshot: {
    id: 'grapeshot',
    name: 'Canister Grape',
    hullDamage: 0.05,
    sailDamage: 0.15,
    crewDamage: 1.6,
    rangeMultiplier: 0.55,
    speed: 62,
    color: '#94a3b8',
    cost: 5,
    description: 'Packed lead canister bursting into lethal shrapnel to sweep enemy crews before boarding.',
  },
  bombs: {
    id: 'bombs',
    name: 'Explosive Bombs',
    hullDamage: 1.7,
    sailDamage: 0.35,
    crewDamage: 0.50,
    rangeMultiplier: 0.70,
    speed: 40,
    color: '#f97316',
    cost: 8,
    description: 'Hollow gunpowder-filled mortar bombs triggering devastating fires and splinter explosions.',
  },
};

export interface TradeGoodSpec {
  id: string;
  name: string;
  basePrice: number;
  unitWeight: number;
  icon: string;
  description: string;
}

export const TRADE_GOODS: Record<string, TradeGoodSpec> = {
  rum: { id: 'rum', name: 'Vintage Rum', basePrice: 24, unitWeight: 1, icon: '🍺', description: 'Distilled sugarcane rum, beloved by sailors and privateers.' },
  spices: { id: 'spices', name: 'Exotic Spices', basePrice: 95, unitWeight: 1, icon: '🌶️', description: 'Rare nutmeg and cloves fetching astronomical prices in European capitals.' },
  silk: { id: 'silk', name: 'Orient Silk', basePrice: 110, unitWeight: 1, icon: '🧵', description: 'Finest luxury fabrics favored by nobility and court merchant cartels.' },
  tobacco: { id: 'tobacco', name: 'Virginia Leaf', basePrice: 45, unitWeight: 1, icon: '🍂', description: 'Cured aromatic leaves in high demand across continental ports.' },
  silver: { id: 'silver', name: 'Silver Bullion', basePrice: 150, unitWeight: 2, icon: '🪙', description: 'Mined Spanish treasure bars plundered from treasure galleons.' },
  gunpowder: { id: 'gunpowder', name: 'Black Powder', basePrice: 32, unitWeight: 1, icon: '💥', description: 'Essential combustible powder barrels required for battery broadsides.' },
  medicines: { id: 'medicines', name: 'Apothecary Herbs', basePrice: 55, unitWeight: 1, icon: '🌿', description: 'Quinine bark and restorative salves preventing scurvy at sea.' },
  planks: { id: 'planks', name: 'Seasoned Oak', basePrice: 12, unitWeight: 2, icon: '🪵', description: 'Dense curved hull timber needed for shipyard repairs and refits.' },
};

export type NationId = 'england' | 'france' | 'spain' | 'holland' | 'pirates';

export interface NationSpec {
  id: NationId;
  name: string;
  color: string;
  flagEmoji: string;
  adjective: string;
  description: string;
  defaultRelations: Record<NationId, number>; // -1 war, 0 neutral, 1 peace
}

export const NATIONS: Record<NationId, NationSpec> = {
  england: {
    id: 'england',
    name: 'Kingdom of England',
    color: '#dc2626',
    flagEmoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    adjective: 'English',
    description: 'Disciplined Royal Navy fleet dominating maritime trade routes with powerful lines of battle.',
    defaultRelations: { england: 1, france: -1, spain: -1, holland: 1, pirates: -1 },
  },
  france: {
    id: 'france',
    name: 'Kingdom of France',
    color: '#2563eb',
    flagEmoji: '🇫🇷',
    adjective: 'French',
    description: 'Elegant naval architecture mounting long-range chaser guns and swift sailing frigates.',
    defaultRelations: { england: -1, france: 1, spain: 0, holland: 0, pirates: -1 },
  },
  spain: {
    id: 'spain',
    name: 'Spanish Empire',
    color: '#eab308',
    flagEmoji: '🇪🇸',
    adjective: 'Spanish',
    description: 'Heavily armored gold bullion treasure fleets protected by towering multi-deck galleons.',
    defaultRelations: { england: -1, france: 0, spain: 1, holland: -1, pirates: -1 },
  },
  holland: {
    id: 'holland',
    name: 'United Provinces of the Netherlands',
    color: '#ea580c',
    flagEmoji: '🇳🇱',
    adjective: 'Dutch',
    description: 'Astute merchant trade syndicates commanding fast fluyts and armed colonial trade barques.',
    defaultRelations: { england: 1, france: 0, spain: -1, holland: 1, pirates: -1 },
  },
  pirates: {
    id: 'pirates',
    name: 'Brotherhood of the Coast',
    color: '#0f172a',
    flagEmoji: '🏴‍☠️',
    adjective: 'Pirate',
    description: 'Outlaw corsairs, buccaneers, and freebooters flying the skull and crossbones.',
    defaultRelations: { england: -1, france: -1, spain: -1, holland: -1, pirates: 1 },
  },
};

export interface IslandHavenSpec {
  id: string;
  name: string;
  nation: NationId;
  position: [number, number]; // [x, z] coordinates on 3D ocean map
  radius: number;
  tier: number;
  color: string;
  exports: string[]; // cheap local produce
  imports: string[]; // premium demand goods
  facilities: string[];
  availableShips: string[];
  tradeBonus: string;
  description: string;
}

export const ISLAND_HAVENS: IslandHavenSpec[] = [
  {
    id: 'oxbay',
    name: 'Oxbay',
    nation: 'england',
    position: [-380, -220],
    radius: 80,
    tier: 1,
    color: '#dc2626',
    exports: ['rum', 'provisions'],
    imports: ['silver', 'silk'],
    facilities: ['Royal Shipyard', 'Crown Customs', 'The Anchor Tavern'],
    availableShips: ['tartane', 'lugger', 'sloop', 'schooner', 'barque'],
    tradeBonus: 'Plentiful cheap Rum export and high payout for Silk',
    description: 'Thriving English colony nestled in a deep natural bay surrounded by verdant sugarcane plantations.',
  },
  {
    id: 'redmond',
    name: 'Redmond',
    nation: 'england',
    position: [120, -320],
    radius: 95,
    tier: 3,
    color: '#b91c1c',
    exports: ['tobacco', 'planks'],
    imports: ['medicines', 'spices'],
    facilities: ['Grand Admiralty Shipyard', 'Governor Palace', 'Royal Navy Arsenal', 'The Red Lion Tavern'],
    availableShips: ['sloop', 'barque', 'brig', 'frigate', 'battleship', 'manowar'],
    tradeBonus: 'Capital shipyard capable of refitting First-Rate Men-of-War',
    description: 'The fortified crown jewel of the English Antilles, garrisoned by royal marines and heavy batteries.',
  },
  {
    id: 'isla_muelle',
    name: 'Isla Muelle',
    nation: 'spain',
    position: [380, -240],
    radius: 90,
    tier: 3,
    color: '#ca8a04',
    exports: ['silver', 'tobacco'],
    imports: ['gunpowder', 'planks'],
    facilities: ['Spanish Royal Drydock', 'San Cristobal Cathedral', 'Galleon Depot', 'Bounty Board'],
    availableShips: ['barque', 'brig', 'galleon', 'frigate', 'battleship'],
    tradeBonus: 'High purchase prices for Gunpowder & Timber',
    description: 'Colossal stone bastions safeguarding the Spanish treasure fleet staging grounds.',
  },
  {
    id: 'conceicao',
    name: 'Conceicao',
    nation: 'spain',
    position: [460, 160],
    radius: 75,
    tier: 2,
    color: '#d97706',
    exports: ['spices', 'silver'],
    imports: ['provisions', 'planks'],
    facilities: ['Colonial Shipyard', 'Merchant Exchange', 'Tavern of the Cross'],
    availableShips: ['lugger', 'sloop', 'brig', 'galleon'],
    tradeBonus: 'Exotic Spices exported at direct plantation prices',
    description: 'Lush tropical Spanish island celebrated for spice gardens and hidden mountain passes.',
  },
  {
    id: 'falaise_de_fleur',
    name: 'Falaise de Fleur',
    nation: 'france',
    position: [360, 320],
    radius: 90,
    tier: 3,
    color: '#2563eb',
    exports: ['silk', 'medicines'],
    imports: ['rum', 'tobacco'],
    facilities: ['French Naval Dockyard', 'Governor Chancellery', 'Fleur-de-Lis Tavern', 'Trade Consortium'],
    availableShips: ['schooner', 'barque', 'brig', 'corvette', 'frigate'],
    tradeBonus: 'Luxury Silk and Apothecary Medicines produced locally',
    description: 'Picturesque cliffside French port protected by ornate ramparts and coastal gun batteries.',
  },
  {
    id: 'douwesen',
    name: 'Douwesen',
    nation: 'holland',
    position: [440, 480],
    radius: 80,
    tier: 2,
    color: '#ea580c',
    exports: ['planks', 'provisions'],
    imports: ['rum', 'spices'],
    facilities: ['Dutch Fluyt Drydock', 'East India Trading Post', 'The Windmill Inn'],
    availableShips: ['lugger', 'sloop', 'barque', 'brig', 'frigate'],
    tradeBonus: 'Best exchange rates on trade commodities (+15% Trade Margin)',
    description: 'Charming Dutch trading haven with neat brick warehouses and active merchant quays.',
  },
  {
    id: 'quebradas',
    name: 'Quebradas Costillas',
    nation: 'pirates',
    position: [-440, 280],
    radius: 85,
    tier: 1,
    color: '#18181b',
    exports: ['gunpowder', 'rum'],
    imports: ['medicines', 'provisions'],
    facilities: ['Pirate Slipway', 'Corsair Den', 'The Bloody Dagger Tavern', 'Black Market'],
    availableShips: ['tartane', 'lugger', 'sloop', 'schooner', 'brig', 'corvette'],
    tradeBonus: 'Black Market contraband fencing and pirate recruit discounts',
    description: 'Treacherous coral maze shielding the most notorious pirate den in the Caribbean.',
  },
  {
    id: 'isle-of-crowns',
    name: 'Isle of Crowns',
    nation: 'england',
    position: [0, -280],
    radius: 80,
    tier: 3,
    color: '#eab308',
    exports: ['gunpowder', 'silver'],
    imports: ['spices', 'silk'],
    facilities: ['Royal Shipyard', 'Crown Admiralty', 'Grand Merchant Bank'],
    availableShips: ['tartane', 'sloop', 'barque', 'galleon', 'frigate', 'battleship', 'manowar'],
    tradeBonus: '+20% selling price on Spices & Silk',
    description: 'Grand Royal Naval Citadel guarding the sovereign sea lanes of the Realm of Crowns.',
  },
  {
    id: 'tortuga-haven',
    name: 'Tortuga Pirate Haven',
    nation: 'pirates',
    position: [420, 140],
    radius: 75,
    tier: 2,
    color: '#ef4444',
    exports: ['rum', 'silver'],
    imports: ['gunpowder', 'planks'],
    facilities: ['Pirate Shipyard', 'The Skull Tavern', 'Smugglers Den', 'Bounty Board'],
    availableShips: ['tartane', 'lugger', 'sloop', 'schooner', 'brig', 'corvette'],
    tradeBonus: '+30% selling price on Plundered Rum & Silver Bullion',
    description: 'Freebooter sanctuary governed by the code of the Brethren of the Coast.',
  },
  {
    id: 'smugglers-atoll',
    name: "Smuggler's Atoll",
    nation: 'pirates',
    position: [-360, 140],
    radius: 65,
    tier: 1,
    color: '#10b981',
    exports: ['gunpowder', 'planks'],
    imports: ['silk', 'silver'],
    facilities: ['Hidden Drydock', 'Black Market', 'Quartermaster Store'],
    availableShips: ['lugger', 'sloop', 'schooner', 'brig'],
    tradeBonus: 'Cheap Black Powder and Ship Planks (-25% cost)',
    description: 'Secluded ring of coral reefs where duty-free contraband and illicit cargoes flow day and night.',
  },
  {
    id: 'serpent-reef',
    name: 'Serpent Reef Outpost',
    nation: 'pirates',
    position: [-360, 420],
    radius: 70,
    tier: 2,
    color: '#8b5cf6',
    exports: ['silver', 'medicines'],
    imports: ['gunpowder', 'rum'],
    facilities: ['Corsair Arsenal', 'Lookout Tower', 'Naval Cannon Foundry'],
    availableShips: ['schooner', 'brig', 'corvette', 'frigate'],
    tradeBonus: 'High-caliber 24lb and 32lb cannon upgrades available',
    description: 'Jagged sea stacks prowled by elite privateers and corsair raiders.',
  },
  {
    id: 'brethrens_vault',
    name: "The Brethren's Vault (Black Market Cave)",
    nation: 'pirates',
    position: [-380, 220],
    radius: 80,
    tier: 3,
    color: '#7c3aed',
    exports: ['gunpowder', 'silver', 'relics'],
    imports: ['rum', 'silk', 'medicines'],
    facilities: [
      "Black Market Contraband Exchange",
      "Smuggler's Secret Drydock",
      'Skull & Chains Grotto',
      'Pirate Code Truce Sanctuary',
    ],
    availableShips: ['dragon_junk', 'treasure_junk', 'galleass', 'sloop', 'brig', 'corvette'],
    tradeBonus: '+50% Payout on Plundered Goods & Sacred Truce under the Pirate Code',
    description: 'Secret volcanic sea-cave sanctuary protected by the Pirate Code. Skeletons in iron gibbets and piles of gold doubloons guard the most lucrative black market in the Caribbean.',
  },
];

// ---------------------------------------------------------------------------
// SEA DOGS CAPTAIN SKILLS SYSTEM
// ---------------------------------------------------------------------------

export type CaptainSkillId =
  | 'leadership'
  | 'fencing'
  | 'navigation'
  | 'accuracy'
  | 'cannons'
  | 'boarding'
  | 'defense'
  | 'repair'
  | 'trade'
  | 'luck';

export interface CaptainSkillSpec {
  id: CaptainSkillId;
  name: string;
  icon: string;
  bonusText: string;
  description: string;
}

export const CAPTAIN_SKILLS: Record<CaptainSkillId, CaptainSkillSpec> = {
  leadership: {
    id: 'leadership',
    name: 'Leadership',
    icon: '👑',
    bonusText: '+1 Max Squadron ship per 3 pts, +5% crew morale',
    description: 'Inspires loyalty and bravery among officers and sailors, mitigating mutinies.',
  },
  fencing: {
    id: 'fencing',
    name: 'Fencing',
    icon: '⚔️',
    bonusText: '+3% melee strike damage and parry chance per pt',
    description: 'Mastery of cutlass, rapier, and dagger during hand-to-hand boarding combat.',
  },
  navigation: {
    id: 'navigation',
    name: 'Navigation',
    icon: '🧭',
    bonusText: '+2% ship speed, +1.5% turn rate in all winds per pt',
    description: 'Knowledge of sea currents, trimming sails, and tacking through adverse squalls.',
  },
  accuracy: {
    id: 'accuracy',
    name: 'Accuracy',
    icon: '🎯',
    bonusText: '+3% cannon broadside hit chance and tighter shot groupings per pt',
    description: 'Expertise in gun laying, elevation wedges, and timing wave crest rolls.',
  },
  cannons: {
    id: 'cannons',
    name: 'Cannons',
    icon: '💥',
    bonusText: '-4% reload duration and reduced risk of gun dismount per pt',
    description: 'Rigorous gun deck drill, sponge swabbing, and rapid powder cartidge reloading.',
  },
  boarding: {
    id: 'boarding',
    name: 'Boarding',
    icon: '🏴‍☠️',
    bonusText: '+6% crew boarding power and enemy casualty infliction per pt',
    description: 'Grappling iron techniques, netting clearance, and ferocious storming rushes.',
  },
  defense: {
    id: 'defense',
    name: 'Defense',
    icon: '🛡️',
    bonusText: '+3% hull damage mitigation and sailor casualty reduction per pt',
    description: 'Reinforced timber bulwarks, hammock barricades, and damage control teams.',
  },
  repair: {
    id: 'repair',
    name: 'Repair',
    icon: '🔨',
    bonusText: '-5% shipyard gold repair costs, faster at-sea carpenter mending',
    description: 'Carpentry, caulking pitch, and rigging splices keeping ships afloat in battle.',
  },
  trade: {
    id: 'trade',
    name: 'Trade',
    icon: '💰',
    bonusText: '+1.5% selling prices, -1.5% purchase costs at colonial markets per pt',
    description: 'Appraisal of contraband, haggling with port merchants, and tariff avoidance.',
  },
  luck: {
    id: 'luck',
    name: 'Luck',
    icon: '🍀',
    bonusText: '+2% chance of critical hits, +10% extra gold found in prize holds per pt',
    description: 'Favorable winds, miraculous ricochets, and uncharted treasure wrecks.',
  },
};

export interface CaptainProfile {
  name: string;
  nation: NationId;
  level: number;
  xp: number;
  freeSkillPoints: number;
  skills: Record<CaptainSkillId, number>;
  gold: number;
  reputation: Record<NationId, number>; // -100 to 100
}

export const getXpForCaptainLevel = (lvl: number): number => {
  return 100 * lvl * lvl;
};

export const createDefaultCaptain = (name = 'Captain', nation: NationId = 'england'): CaptainProfile => ({
  name,
  nation,
  level: 1,
  xp: 0,
  freeSkillPoints: 2,
  skills: {
    leadership: 1,
    fencing: 2,
    navigation: 2,
    accuracy: 2,
    cannons: 2,
    boarding: 1,
    defense: 1,
    repair: 1,
    trade: 1,
    luck: 1,
  },
  gold: 2400,
  reputation: {
    england: 15,
    france: 0,
    spain: -10,
    holland: 5,
    pirates: 0,
  },
});

// ---------------------------------------------------------------------------
// GOVERNOR & TAVERN QUEST ENGINE
// ---------------------------------------------------------------------------

export type QuestKind = 'deliver' | 'hunt' | 'passenger';

export interface NavalQuest {
  id: string;
  kind: QuestKind;
  title: string;
  fromIslandId: string;
  toIslandId: string;
  deadlineDay: number;
  rewardGold: number;
  rewardXp: number;
  goodsId?: string;
  goodsUnits?: number;
  targetShipClass?: string;
  isCompleted?: boolean;
}

export const generateIslandQuests = (fromIslandId: string, currentDay: number): NavalQuest[] => {
  const otherIslands = ISLAND_HAVENS.filter((i) => i.id !== fromIslandId);
  const quests: NavalQuest[] = [];

  // 1. Cargo delivery quest
  const dest1 = otherIslands[Math.floor(Math.random() * otherIslands.length)];
  const goodsKeys = Object.keys(TRADE_GOODS);
  const chosenGood = goodsKeys[Math.floor(Math.random() * goodsKeys.length)];
  const units = 15 + Math.floor(Math.random() * 25);
  const reward1 = 600 + units * 25 + Math.floor(Math.random() * 200);

  quests.push({
    id: `quest-${fromIslandId}-deliver-${Date.now()}-${Math.random()}`,
    kind: 'deliver',
    title: `Deliver ${units} units of ${TRADE_GOODS[chosenGood].name} to ${dest1.name}`,
    fromIslandId,
    toIslandId: dest1.id,
    deadlineDay: currentDay + 14,
    rewardGold: reward1,
    rewardXp: 180,
    goodsId: chosenGood,
    goodsUnits: units,
  });

  // 2. Pirate bounty hunt quest
  const dest2 = otherIslands[Math.floor(Math.random() * otherIslands.length)];
  const targets = ['lugger', 'sloop', 'schooner', 'brig', 'corvette'];
  const chosenTarget = targets[Math.floor(Math.random() * targets.length)];
  const targetSpec = SHIP_CLASSES[chosenTarget];
  const reward2 = 900 + (8 - targetSpec.rank) * 350;

  quests.push({
    id: `quest-${fromIslandId}-hunt-${Date.now()}-${Math.random()}`,
    kind: 'hunt',
    title: `Hunt down Pirate ${targetSpec.name} patrol near ${dest2.name}`,
    fromIslandId,
    toIslandId: dest2.id,
    deadlineDay: currentDay + 20,
    rewardGold: reward2,
    rewardXp: 260,
    targetShipClass: chosenTarget,
  });

  // 3. Passenger escort quest
  const dest3 = otherIslands[Math.floor(Math.random() * otherIslands.length)];
  quests.push({
    id: `quest-${fromIslandId}-passenger-${Date.now()}-${Math.random()}`,
    kind: 'passenger',
    title: `Escort Colonial Emissary safely to ${dest3.name}`,
    fromIslandId,
    toIslandId: dest3.id,
    deadlineDay: currentDay + 10,
    rewardGold: 750,
    rewardXp: 150,
  });

  return quests;
};

// ---------------------------------------------------------------------------
// MARKET ECONOMY & COMMODITY PRICING FORMULAS
// ---------------------------------------------------------------------------

export const calculateCommodityBuyPrice = (
  goodId: string,
  island: IslandHavenSpec,
  tradeSkill: number
): number => {
  const good = TRADE_GOODS[goodId];
  if (!good) return 10;
  let mult = 1.0;
  if (island.exports.includes(goodId)) mult = 0.65; // cheap produce
  if (island.imports.includes(goodId)) mult = 1.85; // high demand
  const skillDiscount = 1.0 - tradeSkill * 0.015;
  return Math.max(1, Math.round(good.basePrice * mult * skillDiscount));
};

export const calculateCommoditySellPrice = (
  goodId: string,
  island: IslandHavenSpec,
  tradeSkill: number
): number => {
  const good = TRADE_GOODS[goodId];
  if (!good) return 8;
  let mult = 0.8;
  if (island.exports.includes(goodId)) mult = 0.45; // selling local produce pays less
  if (island.imports.includes(goodId)) mult = 1.45; // imported goods fetch a premium
  const skillBonus = 1.0 + tradeSkill * 0.015;
  return Math.max(1, Math.round(good.basePrice * mult * skillBonus));
};

