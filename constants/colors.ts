/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#17212b',
    tint: '#f5a524',

    // Core surfaces
    background: '#f7f8f5',
    foreground: '#17212b',

    // Cards / elevated surfaces
    card: '#ffffff',
    cardForeground: '#17212b',

    // Primary action color (buttons, links, active states)
    primary: '#f5a524',
    primaryForeground: '#ffffff',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#eaf0e8',
    secondaryForeground: '#36513f',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#edf1ed',
    mutedForeground: '#708078',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#d8eee2',
    accentForeground: '#24533c',

    // Destructive actions (delete, error states)
    destructive: '#d95555',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#dfe6df',
    input: '#d2dbd3',

    navy: '#17212b',
    teal: '#3f8c71',
    tealDark: '#24533c',
    amberSoft: '#fff2d4',
    coralSoft: '#fde8e4',
    white: '#ffffff',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
