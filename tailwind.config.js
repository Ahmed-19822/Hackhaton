/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // MaintainIQ "control panel" palette
        base: '#F2F3F1',       // steel-gray page background
        panel: '#FFFFFF',      // card / panel surface
        ink: '#12181B',        // primary text (near-black slate)
        steel: {
          50: '#EEF2F4',
          100: '#D8E1E6',
          300: '#8FA6AF',
          500: '#3E5C66',
          700: '#2E4650',
          900: '#0F1720',
        },
        signal: {
          teal: '#1F7A6C',      // primary action / operational
          amber: '#E8A33D',     // warning / issue reported
          rust: '#C1502E',      // critical / out of service
          slate: '#5B6B73',     // neutral / retired
        },
      },
      fontFamily: {
        display: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        body: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        tag: '4px',
      },
    },
  },
  plugins: [],
}
