import type { SpellLevel } from './types';

export type SpellManifestStatus = 'implemented' | 'pending';

export interface SpellManifestMembership {
  readonly list: 'Cleric' | 'Wizard';
  readonly source: string;
}

export interface SpellManifestRow {
  readonly id: string;
  readonly name: string;
  readonly level: SpellLevel;
  readonly memberships: readonly SpellManifestMembership[];
  readonly status: SpellManifestStatus;
  /** Precise residual after the executable mechanical core; never a fallback. */
  readonly partial?: string;
}

/**
 * D260 level-7 Fighter/Cleric/Wizard coverage inventory. Fighter/Champion has
 * no spell list. Rows are the deduplicated union of the independently printed
 * Cleric and Wizard lists through level 4, plus their selectable cantrips.
 */
export const SPELL_MANIFEST = [
  { id: "acid-splash", name: "Acid Splash", level: 0, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:246" }], status: 'implemented' },
  { id: "chill-touch", name: "Chill Touch", level: 0, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:248" }], status: 'implemented' },
  { id: "dancing-lights", name: "Dancing Lights", level: 0, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:250" }], status: 'implemented', partial: 'Light count, radii, concentration, duration, and movement limit are typed; independent light positions await created-object spatial state.' },
  { id: "elementalism", name: "Elementalism", level: 0, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:252" }], status: 'implemented', partial: 'All five choices are typed; doors, surfaces, containers, and elemental material mutations await encounter object state.' },
  { id: "fire-bolt", name: "Fire Bolt", level: 0, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:253" }], status: 'implemented' },
  { id: "guidance", name: "Guidance", level: 0, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:28" }], status: 'implemented' },
  { id: "light", name: "Light", level: 0, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:30" }, { list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:254" }], status: 'implemented', partial: 'Light radii and duration are typed; attachment to a chosen object and opaque covering await encounter object state.' },
  { id: "mage-hand", name: "Mage Hand", level: 0, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:260" }], status: 'implemented', partial: 'Range, movement, duration, and carrying limit are typed; manipulating inventory and doors awaits encounter object state.' },
  { id: "mending", name: "Mending", level: 0, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:32" }, { list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:261" }], status: 'implemented', partial: 'Casting time and one-foot repair limit are executable data; applying repair awaits object damage state.' },
  { id: "message", name: "Message", level: 0, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:263" }], status: 'implemented', partial: 'Target, range, reply, duration, and magical-silence block are typed; material-specific wall blocking awaits barrier material data.' },
  { id: "minor-illusion", name: "Minor Illusion", level: 0, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:265" }], status: 'implemented', partial: 'Sound/image modes, size, and duration are typed; Study checks and per-creature discernment await illusion-observer state.' },
  { id: "poison-spray", name: "Poison Spray", level: 0, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:266" }], status: 'implemented' },
  { id: "prestidigitation", name: "Prestidigitation", level: 0, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:267" }], status: 'implemented', partial: 'All six choices and the three-effect cap are typed; their object and sensory mutations await encounter object state.' },
  { id: "ray-of-frost", name: "Ray of Frost", level: 0, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:269" }], status: 'implemented' },
  { id: "resistance", name: "Resistance", level: 0, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:33" }], status: 'implemented', partial: 'Chosen damage type, 1d4 reduction, concentration, and once-per-turn constraint are typed; reduction awaits typed per-term damage interception.' },
  { id: "sacred-flame", name: "Sacred Flame", level: 0, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:34" }], status: 'implemented' },
  { id: "shocking-grasp", name: "Shocking Grasp", level: 0, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:270" }], status: 'implemented' },
  { id: "spare-the-dying", name: "Spare the Dying", level: 0, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:36" }], status: 'implemented' },
  { id: "thaumaturgy", name: "Thaumaturgy", level: 0, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:37" }], status: 'implemented', partial: 'All six choices and the three-effect cap are typed; their object and sensory mutations await encounter object state.' },
  { id: "true-strike", name: "True Strike", level: 0, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:271" }], status: 'implemented', partial: 'Spellcasting attack, weapon damage, and level-7 Radiant rider execute; proficiency and the selected weapon range await the equipment-backed cast adapter.' },
  { id: "alarm", name: "Alarm", level: 1, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:275" }], status: 'pending' },
  { id: "bane", name: "Bane", level: 1, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:43" }], status: 'implemented' },
  { id: "bless", name: "Bless", level: 1, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:44" }], status: 'implemented' },
  { id: "burning-hands", name: "Burning Hands", level: 1, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:277" }], status: 'implemented' },
  { id: "charm-person", name: "Charm Person", level: 1, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:279" }], status: 'implemented', partial: 'The Charmed condition and combat save are executable; Humanoid typing, ally-damage expiry, and post-expiry knowledge await creature-type and alliance history.' },
  { id: "chromatic-orb", name: "Chromatic Orb", level: 1, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:280" }], status: 'pending' },
  { id: "color-spray", name: "Color Spray", level: 1, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:281" }], status: 'pending' },
  { id: "command", name: "Command", level: 1, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:45" }], status: 'pending' },
  { id: "comprehend-languages", name: "Comprehend Languages", level: 1, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:283" }], status: 'pending' },
  { id: "create-or-destroy-water", name: "Create or Destroy Water", level: 1, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:47" }], status: 'pending' },
  { id: "cure-wounds", name: "Cure Wounds", level: 1, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:49" }], status: 'implemented' },
  { id: "detect-evil-and-good", name: "Detect Evil and Good", level: 1, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:50" }], status: 'pending' },
  { id: "detect-magic", name: "Detect Magic", level: 1, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:52" }, { list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:285" }], status: 'pending' },
  { id: "detect-poison-and-disease", name: "Detect Poison and Disease", level: 1, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:53" }], status: 'pending' },
  { id: "disguise-self", name: "Disguise Self", level: 1, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:286" }], status: 'pending' },
  { id: "expeditious-retreat", name: "Expeditious Retreat", level: 1, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:288" }], status: 'pending' },
  { id: "false-life", name: "False Life", level: 1, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:290" }], status: 'implemented' },
  { id: "feather-fall", name: "Feather Fall", level: 1, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:291" }], status: 'pending' },
  { id: "find-familiar", name: "Find Familiar", level: 1, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:292" }], status: 'pending' },
  { id: "floating-disk", name: "Floating Disk", level: 1, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:293" }], status: 'pending' },
  { id: "fog-cloud", name: "Fog Cloud", level: 1, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:294" }], status: 'pending' },
  { id: "grease", name: "Grease", level: 1, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:296" }], status: 'pending' },
  { id: "guiding-bolt", name: "Guiding Bolt", level: 1, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:54" }], status: 'implemented' },
  { id: "healing-word", name: "Healing Word", level: 1, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:56" }], status: 'implemented' },
  { id: "hideous-laughter", name: "Hideous Laughter", level: 1, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:298" }], status: 'pending' },
  { id: "ice-knife", name: "Ice Knife", level: 1, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:299" }], status: 'pending' },
  { id: "identify", name: "Identify", level: 1, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:300" }], status: 'pending' },
  { id: "illusory-script", name: "Illusory Script", level: 1, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:301" }], status: 'pending' },
  { id: "inflict-wounds", name: "Inflict Wounds", level: 1, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:58" }], status: 'implemented' },
  { id: "jump", name: "Jump", level: 1, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:302" }], status: 'pending' },
  { id: "longstrider", name: "Longstrider", level: 1, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:303" }], status: 'pending' },
  { id: "mage-armor", name: "Mage Armor", level: 1, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:304" }], status: 'pending' },
  { id: "magic-missile", name: "Magic Missile", level: 1, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:306" }], status: 'implemented' },
  { id: "protection-from-evil-and-good", name: "Protection from Evil and Good", level: 1, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:59" }, { list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:308" }], status: 'pending' },
  { id: "purify-food-and-drink", name: "Purify Food and Drink", level: 1, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:60" }], status: 'pending' },
  { id: "ray-of-sickness", name: "Ray of Sickness", level: 1, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:309" }], status: 'pending' },
  { id: "sanctuary", name: "Sanctuary", level: 1, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:61" }], status: 'pending' },
  { id: "shield", name: "Shield", level: 1, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:310" }], status: 'implemented' },
  { id: "shield-of-faith", name: "Shield of Faith", level: 1, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:62" }], status: 'implemented' },
  { id: "silent-image", name: "Silent Image", level: 1, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:312" }], status: 'pending' },
  { id: "sleep", name: "Sleep", level: 1, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:314" }], status: 'pending' },
  { id: "thunderwave", name: "Thunderwave", level: 1, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:316" }], status: 'implemented' },
  { id: "unseen-servant", name: "Unseen Servant", level: 1, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:318" }], status: 'pending' },
  { id: "acid-arrow", name: "Acid Arrow", level: 2, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:324" }], status: 'pending' },
  { id: "aid", name: "Aid", level: 2, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:66" }], status: 'pending' },
  { id: "alter-self", name: "Alter Self", level: 2, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:325" }], status: 'pending' },
  { id: "arcane-lock", name: "Arcane Lock", level: 2, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:326" }], status: 'pending' },
  { id: "arcanists-magic-aura", name: "Arcanist’s Magic Aura", level: 2, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:327" }], status: 'pending' },
  { id: "augury", name: "Augury", level: 2, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:67" }, { list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:328" }], status: 'pending' },
  { id: "blindness-deafness", name: "Blindness/Deafness", level: 2, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:69" }, { list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:329" }], status: 'pending' },
  { id: "blur", name: "Blur", level: 2, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:330" }], status: 'pending' },
  { id: "calm-emotions", name: "Calm Emotions", level: 2, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:71" }], status: 'pending' },
  { id: "continual-flame", name: "Continual Flame", level: 2, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:72" }, { list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:331" }], status: 'pending' },
  { id: "darkness", name: "Darkness", level: 2, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:332" }], status: 'pending' },
  { id: "darkvision", name: "Darkvision", level: 2, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:333" }], status: 'pending' },
  { id: "detect-thoughts", name: "Detect Thoughts", level: 2, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:334" }], status: 'pending' },
  { id: "dragons-breath", name: "Dragon’s Breath", level: 2, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:335" }], status: 'pending' },
  { id: "enhance-ability", name: "Enhance Ability", level: 2, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:73" }, { list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:336" }], status: 'pending' },
  { id: "enlarge-reduce", name: "Enlarge/Reduce", level: 2, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:337" }], status: 'pending' },
  { id: "find-traps", name: "Find Traps", level: 2, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:75" }], status: 'pending' },
  { id: "flaming-sphere", name: "Flaming Sphere", level: 2, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:338" }], status: 'pending' },
  { id: "gentle-repose", name: "Gentle Repose", level: 2, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:77" }, { list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:339" }], status: 'pending' },
  { id: "gust-of-wind", name: "Gust of Wind", level: 2, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:340" }], status: 'pending' },
  { id: "hold-person", name: "Hold Person", level: 2, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:78" }, { list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:341" }], status: 'pending' },
  { id: "invisibility", name: "Invisibility", level: 2, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:342" }], status: 'pending' },
  { id: "knock", name: "Knock", level: 2, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:343" }], status: 'pending' },
  { id: "lesser-restoration", name: "Lesser Restoration", level: 2, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:79" }], status: 'pending' },
  { id: "levitate", name: "Levitate", level: 2, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:344" }], status: 'pending' },
  { id: "locate-object", name: "Locate Object", level: 2, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:81" }, { list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:345" }], status: 'pending' },
  { id: "magic-mouth", name: "Magic Mouth", level: 2, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:346" }], status: 'pending' },
  { id: "magic-weapon", name: "Magic Weapon", level: 2, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:347" }], status: 'pending' },
  { id: "mind-spike", name: "Mind Spike", level: 2, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:348" }], status: 'pending' },
  { id: "mirror-image", name: "Mirror Image", level: 2, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:349" }], status: 'pending' },
  { id: "misty-step", name: "Misty Step", level: 2, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:350" }], status: 'pending' },
  { id: "prayer-of-healing", name: "Prayer of Healing", level: 2, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:82" }], status: 'pending' },
  { id: "protection-from-poison", name: "Protection from Poison", level: 2, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:87" }], status: 'pending' },
  { id: "ray-of-enfeeblement", name: "Ray of Enfeeblement", level: 2, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:351" }], status: 'pending' },
  { id: "rope-trick", name: "Rope Trick", level: 2, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:352" }], status: 'pending' },
  { id: "scorching-ray", name: "Scorching Ray", level: 2, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:353" }], status: 'pending' },
  { id: "see-invisibility", name: "See Invisibility", level: 2, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:354" }], status: 'pending' },
  { id: "shatter", name: "Shatter", level: 2, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:355" }], status: 'pending' },
  { id: "silence", name: "Silence", level: 2, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:89" }], status: 'pending' },
  { id: "spider-climb", name: "Spider Climb", level: 2, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:356" }], status: 'pending' },
  { id: "spiritual-weapon", name: "Spiritual Weapon", level: 2, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:90" }], status: 'pending' },
  { id: "suggestion", name: "Suggestion", level: 2, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:357" }], status: 'pending' },
  { id: "warding-bond", name: "Warding Bond", level: 2, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:91" }], status: 'pending' },
  { id: "web", name: "Web", level: 2, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:358" }], status: 'pending' },
  { id: "zone-of-truth", name: "Zone of Truth", level: 2, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:92" }], status: 'pending' },
  { id: "animate-dead", name: "Animate Dead", level: 3, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:96" }, { list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:362" }], status: 'pending' },
  { id: "beacon-of-hope", name: "Beacon of Hope", level: 3, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:97" }], status: 'pending' },
  { id: "bestow-curse", name: "Bestow Curse", level: 3, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:98" }, { list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:363" }], status: 'pending' },
  { id: "blink", name: "Blink", level: 3, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:364" }], status: 'pending' },
  { id: "clairvoyance", name: "Clairvoyance", level: 3, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:99" }, { list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:365" }], status: 'pending' },
  { id: "counterspell", name: "Counterspell", level: 3, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:366" }], status: 'pending' },
  { id: "create-food-and-water", name: "Create Food and Water", level: 3, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:100" }], status: 'pending' },
  { id: "daylight", name: "Daylight", level: 3, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:101" }], status: 'pending' },
  { id: "dispel-magic", name: "Dispel Magic", level: 3, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:102" }, { list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:367" }], status: 'pending' },
  { id: "fear", name: "Fear", level: 3, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:372" }], status: 'pending' },
  { id: "fireball", name: "Fireball", level: 3, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:373" }], status: 'pending' },
  { id: "fly", name: "Fly", level: 3, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:374" }], status: 'pending' },
  { id: "gaseous-form", name: "Gaseous Form", level: 3, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:375" }], status: 'pending' },
  { id: "glyph-of-warding", name: "Glyph of Warding", level: 3, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:103" }, { list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:376" }], status: 'pending' },
  { id: "haste", name: "Haste", level: 3, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:377" }], status: 'pending' },
  { id: "hypnotic-pattern", name: "Hypnotic Pattern", level: 3, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:378" }], status: 'pending' },
  { id: "lightning-bolt", name: "Lightning Bolt", level: 3, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:379" }], status: 'pending' },
  { id: "magic-circle", name: "Magic Circle", level: 3, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:104" }, { list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:380" }], status: 'pending' },
  { id: "major-image", name: "Major Image", level: 3, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:381" }], status: 'pending' },
  { id: "mass-healing-word", name: "Mass Healing Word", level: 3, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:106" }], status: 'pending' },
  { id: "meld-into-stone", name: "Meld into Stone", level: 3, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:108" }], status: 'pending' },
  { id: "nondetection", name: "Nondetection", level: 3, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:382" }], status: 'pending' },
  { id: "phantom-steed", name: "Phantom Steed", level: 3, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:383" }], status: 'pending' },
  { id: "protection-from-energy", name: "Protection from Energy", level: 3, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:110" }, { list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:384" }], status: 'pending' },
  { id: "remove-curse", name: "Remove Curse", level: 3, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:112" }, { list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:385" }], status: 'pending' },
  { id: "revivify", name: "Revivify", level: 3, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:114" }], status: 'pending' },
  { id: "sending", name: "Sending", level: 3, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:116" }, { list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:386" }], status: 'pending' },
  { id: "sleet-storm", name: "Sleet Storm", level: 3, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:387" }], status: 'pending' },
  { id: "slow", name: "Slow", level: 3, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:388" }], status: 'pending' },
  { id: "speak-with-dead", name: "Speak with Dead", level: 3, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:118" }, { list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:389" }], status: 'pending' },
  { id: "spirit-guardians", name: "Spirit Guardians", level: 3, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:120" }], status: 'pending' },
  { id: "stinking-cloud", name: "Stinking Cloud", level: 3, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:390" }], status: 'pending' },
  { id: "tiny-hut", name: "Tiny Hut", level: 3, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:391" }], status: 'pending' },
  { id: "tongues", name: "Tongues", level: 3, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:122" }, { list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:392" }], status: 'pending' },
  { id: "vampiric-touch", name: "Vampiric Touch", level: 3, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:393" }], status: 'pending' },
  { id: "water-breathing", name: "Water Breathing", level: 3, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:394" }], status: 'pending' },
  { id: "water-walk", name: "Water Walk", level: 3, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:124" }], status: 'pending' },
  { id: "arcane-eye", name: "Arcane Eye", level: 4, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:398" }], status: 'pending' },
  { id: "aura-of-life", name: "Aura of Life", level: 4, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:128" }], status: 'pending' },
  { id: "banishment", name: "Banishment", level: 4, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:130" }, { list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:399" }], status: 'pending' },
  { id: "black-tentacles", name: "Black Tentacles", level: 4, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:400" }], status: 'pending' },
  { id: "blight", name: "Blight", level: 4, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:401" }], status: 'pending' },
  { id: "charm-monster", name: "Charm Monster", level: 4, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:402" }], status: 'pending' },
  { id: "confusion", name: "Confusion", level: 4, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:403" }], status: 'pending' },
  { id: "conjure-minor-elementals", name: "Conjure Minor Elementals", level: 4, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:404" }], status: 'pending' },
  { id: "control-water", name: "Control Water", level: 4, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:131" }, { list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:405" }], status: 'pending' },
  { id: "death-ward", name: "Death Ward", level: 4, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:132" }], status: 'pending' },
  { id: "dimension-door", name: "Dimension Door", level: 4, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:406" }], status: 'pending' },
  { id: "divination", name: "Divination", level: 4, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:133" }, { list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:407" }], status: 'pending' },
  { id: "fabricate", name: "Fabricate", level: 4, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:408" }], status: 'pending' },
  { id: "faithful-hound", name: "Faithful Hound", level: 4, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:409" }], status: 'pending' },
  { id: "fire-shield", name: "Fire Shield", level: 4, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:410" }], status: 'pending' },
  { id: "freedom-of-movement", name: "Freedom of Movement", level: 4, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:134" }], status: 'pending' },
  { id: "greater-invisibility", name: "Greater Invisibility", level: 4, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:411" }], status: 'pending' },
  { id: "guardian-of-faith", name: "Guardian of Faith", level: 4, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:135" }], status: 'pending' },
  { id: "hallucinatory-terrain", name: "Hallucinatory Terrain", level: 4, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:412" }], status: 'pending' },
  { id: "ice-storm", name: "Ice Storm", level: 4, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:413" }], status: 'pending' },
  { id: "locate-creature", name: "Locate Creature", level: 4, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:136" }, { list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:414" }], status: 'pending' },
  { id: "phantasmal-killer", name: "Phantasmal Killer", level: 4, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:415" }], status: 'pending' },
  { id: "polymorph", name: "Polymorph", level: 4, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:420" }], status: 'pending' },
  { id: "private-sanctum", name: "Private Sanctum", level: 4, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:422" }], status: 'pending' },
  { id: "resilient-sphere", name: "Resilient Sphere", level: 4, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:423" }], status: 'pending' },
  { id: "secret-chest", name: "Secret Chest", level: 4, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:424" }], status: 'pending' },
  { id: "stone-shape", name: "Stone Shape", level: 4, memberships: [{ list: 'Cleric', source: "docs/srd/source/cleric-spell-list.txt:137" }, { list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:425" }], status: 'pending' },
  { id: "stoneskin", name: "Stoneskin", level: 4, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:426" }], status: 'pending' },
  { id: "vitriolic-sphere", name: "Vitriolic Sphere", level: 4, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:427" }], status: 'pending' },
  { id: "wall-of-fire", name: "Wall of Fire", level: 4, memberships: [{ list: 'Wizard', source: "docs/srd/source/wizard-spell-list.txt:428" }], status: 'pending' },
] as const satisfies readonly SpellManifestRow[];

export function assertSpellManifestBurnDown(
  rows: readonly SpellManifestRow[],
  definitionFor: (id: string) => { readonly name: string; readonly level: number } | null,
): void {
  const ids = new Set<string>();
  for (const row of rows) {
    if (ids.has(row.id)) throw new Error(`Duplicate spell manifest id ${row.id}.`);
    ids.add(row.id);
    if (row.memberships.length === 0) throw new Error(`Spell ${row.id} has no class-list source.`);
    const definition = definitionFor(row.id);
    if (row.status === 'implemented') {
      if (definition === null) throw new Error(`Implemented spell ${row.id} has no definition.`);
      if (definition.name !== row.name || definition.level !== row.level) {
        throw new Error(`Spell definition ${row.id} does not match its manifest row.`);
      }
    } else if (definition !== null) {
      throw new Error(`Pending spell ${row.id} already has a definition.`);
    }
  }
}
