/** Default agent names for server-side use (subset of frontend list). */
const NAMES = [
    "Apollo", "Archer", "Artemis", "Atlas", "Aurora", "Beacon", "Blaze", "Bolt",
    "Catalyst", "Cipher", "Comet", "Compass", "Corsair", "Crest", "Dagger",
    "Eclipse", "Ember", "Falcon", "Fenix", "Flare", "Forge", "Ghost", "Griffin",
    "Harbinger", "Hawk", "Helix", "Horizon", "Hunter", "Ion", "Iris", "Jade",
    "Kestrel", "Lance", "Lark", "Lynx", "Mantis", "Maverick", "Mercury",
    "Nebula", "Nexus", "Nova", "Obsidian", "Onyx", "Oracle", "Orion", "Osprey",
    "Paladin", "Phantom", "Phoenix", "Pilot", "Prism", "Pulse", "Quasar",
    "Raven", "Razor", "Reaper", "Rogue", "Sage", "Sentinel", "Shadow", "Sigma",
    "Solstice", "Spark", "Specter", "Striker", "Summit", "Talon", "Tempest",
    "Titan", "Torch", "Vanguard", "Vector", "Vertex", "Viper", "Volt", "Warden",
    "Wraith", "Zenith", "Zephyr",
];
export function randomAgentName() {
    return NAMES[Math.floor(Math.random() * NAMES.length)];
}
