# Vinegar - Pause Before Purchase

A Chrome extension that helps users reduce impulsive online shopping by creating mindful pauses and interventions.

> **🤖 Built with AI**: This project was developed entirely using Claude AI and refactored/organized using Claude Code. See [CLAUDE-CODE-TESTING.md](CLAUDE-CODE-TESTING.md) for details on the AI-assisted development process.

## Overview

Vinegar is your anti-shopping assistant that converts shopping impulses into saved time. It creates gentle interventions when you visit shopping sites or add items to your cart, encouraging mindful spending decisions.

### Key Features

- **Smart Cart Detection**: Monitors 20+ major shopping sites with site-specific cart detection
- **Two Intervention Types**:
  - Visit-based: Triggers when you arrive at a shopping site
  - Checkout-based: Activates when items are added to cart
- **Mindful Pauses**: Beautiful breathing exercises and time-based reflections
- **Site Blocking**: Complete blocking option for sites you want to avoid entirely
- **Progress Tracking**: Dashboard shows time saved, wise choices made, and streak tracking
- **Custom Sites** (Premium): Add any website to your monitored list

## Installation

### For Development

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the project directory
5. The extension icon will appear in your Chrome toolbar

### For Users

(Coming soon to Chrome Web Store)

## Supported Sites

The extension comes pre-configured with patterns for:
- Amazon, eBay, Walmart, Target, Best Buy
- Etsy, Wayfair, Costco, AliExpress, Shein
- Nordstrom, Macy's, Sephora, Ulta
- Nike, Adidas, Zara, H&M, ASOS
- And more...

## Project Structure

```
vinegar/
├── manifest.json          # Chrome extension manifest (v3)
├── background.js          # Service worker for extension logic
├── content.js            # Content script for page monitoring
├── popup.html/js/css     # Extension popup interface
├── options.html/js/css   # Settings page
├── dashboard.html/js/css # Progress dashboard
├── icons/                # Extension icons
├── breathing.css         # Breathing exercise styles
├── time.css             # Time intervention styles
├── blocker.css          # Site blocker styles
└── README.md            # This file
```

## Development

### Prerequisites
- Chrome browser
- Basic knowledge of Chrome extensions
- No build tools required (vanilla JS/HTML/CSS)

### Making Changes
1. Edit the files directly
2. Go to `chrome://extensions/`
3. Click the refresh icon on the Vinegar extension
4. Test your changes

### Key Files
- `background.js`: Core logic, intervention timing, site patterns
- `content.js`: Page monitoring, cart detection, intervention display
- `options.js`: Settings management, site selection
- `dashboard.js`: Statistics and progress tracking

## Version History

- **v1.0.0** (Current) - Initial public release with core features complete
  - Known issues exist and are being tracked for v1.1 release
- Previous versions (0.1 - 0.6.8) archived in `vinegar-archive-v0.1-to-v0.6.7.zip`

## Privacy

Vinegar operates entirely locally on your device:
- No external servers or analytics
- No user data collection
- All settings stored in Chrome's local storage
- No account required

## AI Development

This entire Chrome extension was built using Claude AI:
- **Initial Development**: All code written through conversations with Claude AI
- **Project Organization**: Refactored from 15+ version folders to clean structure using Claude Code
- **Bug Discovery**: 7 critical issues identified through AI code analysis
- **Documentation**: All docs generated via AI assistance

For a detailed case study on AI-assisted development, see:
- [CLAUDE-CODE-TESTING.md](CLAUDE-CODE-TESTING.md) - Project transformation results
- [docs/workflow.md](docs/workflow.md) - AI workflow documentation
- [docs/context-management.md](docs/context-management.md) - How AI maintains context

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## License

MIT License (see LICENSE file)

## Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

**Remember**: The goal isn't to never shop online, but to make sure when you do, it's a conscious choice rather than an impulse.