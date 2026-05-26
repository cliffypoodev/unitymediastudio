// Unity Studio Theme - Sleek Dark with Brushed Nickel & Wood Accents
// Inspired by vintage radio aesthetics with modern refinement

export const STUDIO = {
  // Core dark backgrounds
  void: "#0d0d0d",           // Deepest black
  dark: "#141414",           // Primary dark background
  charcoal: "#1a1a1a",       // Secondary background
  slate: "#242424",          // Card/elevated surfaces

  // Brushed nickel metallic accents
  nickel: "#8a8a8a",         // Primary nickel
  nickelLight: "#a8a8a8",    // Lighter nickel for highlights
  nickelDark: "#5c5c5c",     // Darker nickel for shadows
  chrome: "#c0c0c0",         // Bright chrome highlights
  steel: "#71797E",          // Steel accent

  // Warm wood tones
  wood: "#8B5A2B",           // Primary wood brown
  woodLight: "#A67C52",      // Lighter wood for highlights
  woodDark: "#5D3A1A",       // Dark wood grain
  mahogany: "#4A0E0E",       // Rich mahogany accent
  walnut: "#5D4037",         // Walnut brown
  amber: "#FFBF00",          // Warm amber glow (VU meter style)

  // Accent colors (vibrant swirl colors from logo)
  swirlBlue: "#1E90FF",      // Bright blue from swirl
  swirlCyan: "#00CED1",      // Cyan from swirl
  swirlOrange: "#FF6B35",    // Orange from swirl
  swirlPink: "#FF1493",      // Pink/magenta from swirl
  swirlYellow: "#FFD700",    // Yellow from swirl

  // Functional colors
  text: "#FFFFFF",           // Primary text
  textSecondary: "#9CA3AF",  // Secondary text
  textMuted: "#6B7280",      // Muted text
  border: "#2d2d2d",         // Border color

  // Status colors
  success: "#10B981",        // Green for success
  error: "#EF4444",          // Red for errors
  warning: "#F59E0B",        // Warning amber
};

// Gradient presets for consistent styling
export const GRADIENTS = {
  // Main background gradient
  background: [STUDIO.void, STUDIO.dark, STUDIO.charcoal],

  // Nickel button gradient (horizontal)
  nickelButton: [STUDIO.nickelDark, STUDIO.nickel, STUDIO.nickelLight],

  // Wood panel gradient
  woodPanel: [STUDIO.woodDark, STUDIO.wood, STUDIO.woodLight],

  // Accent gradient (vibrant)
  accent: [STUDIO.swirlBlue, STUDIO.swirlCyan],

  // Warm glow gradient
  warmGlow: [STUDIO.amber, STUDIO.swirlOrange],
};
