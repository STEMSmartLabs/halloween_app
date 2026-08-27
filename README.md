# Witches' Halloween Candy Brew (Progressive Web App)

An interactive, realistic dark-themed Halloween Progressive Web App (PWA) designed for children. Connects wirelessly to the **nRF51822 + LIS3DH Magic Wand** over **Web Bluetooth API** to brew magical candy potions, cast spooky spells, and banish Halloween monsters!

---

## Features

- 🧙‍♀️ **Witches' Potion Kitchen**: Real-time bubbling cauldron with dynamic slime liquid gradients, volumetric steam vapor, and heat embers.
- 🍬 **Spooky Candy Alchemy**: Toss ingredients (Gummy Eyeballs, Candy Corn, Bat Wings, Ghost Slime, Mini Pumpkins) and stir with wand gestures to craft Halloween treats!
- 🪄 **Web Bluetooth API Integration**: Real-time 3D acceleration stream and instant gesture event reception from the nRF51822 + LIS3DH wand.
- 🎮 **Virtual Wand Simulator**: Test and play immediately on any laptop or phone using touch, mouse gestures, on-screen quick buttons, and keyboard hotkeys.
- 🔊 **Zero-Dependency Procedural Web Audio Engine**: Generates authentic bubbling cauldron sounds, wand whooshes, thunderbolts, and victory fanfares completely offline.
- 📱 **Installable PWA**: Works 100% offline via Service Worker with full-screen standalone app support on desktop and mobile.

---

## How to Run Locally

### 1. Start a Local Web Server
Web Bluetooth and Service Workers require HTTPS or `localhost`. You can launch a quick local server using Python:

```bash
# Navigate to webapp folder
cd /Users/partha/Documents/SSL/src/MagicWandAG/webapp

# Start local server on port 8000
python3 -m http.server 8000
```

### 2. Open in Your Browser
Open your browser and navigate to:
```
http://localhost:8000
```

> **Recommended Browsers**:
> - **Desktop**: Google Chrome, Microsoft Edge, Opera, or Brave (with Web Bluetooth enabled).
> - **Android**: Google Chrome or Samsung Internet.
> - **iOS / iPadOS**: **Bluefy** (Web BLE browser from the App Store) or WebBLE.

---

## How to Connect the Physical Magic Wand

1. Power on your **nRF51822 + LIS3DH (CJMCU-8223)** board.
2. Click the **Magic Wand** status widget in the top-right corner of the web app.
3. In the browser Bluetooth pairing dialog, select **`HalloweenWand`** or **`MagicWand-HLW`** and click **Pair**.
4. Once connected, your wand's battery percentage and live status will display in the header!

---

## Virtual Wand Controls (For Testing Without Hardware)

You can play and test all recipes using your mouse, touchscreen, or keyboard shortcuts:

| Wand Gesture | Action in Game | Keyboard Shortcut | Mouse / Touch Motion |
| :--- | :--- | :---: | :--- |
| **Stir (Circle)** | Stirs the bubbling slime brew | `[C]` | Drag mouse/finger in a circle |
| **Toss (Flick)** | Tossing ingredients into pot | `[F]` | Quick flick or click ingredient |
| **Bubble (Shake)** | Froths and bubbles the potion | `[S]` | Rapid zig-zag / shake motion |
| **Ignite (Slash)** | Strokes fire under cauldron | `[V]` / `[U]` | Downward vertical slash |
| **Mist (Wave)** | Clears spooky fog | `[W]` | Horizontal left-to-right sweep |
| **Blast (Thrust)** | Casts celebratory candy burst | `[T]` | Forward thrust or screen tap |
| **Mute / Unmute** | Toggles procedural soundscape | `[M]` | Click top speaker button |

---

## Halloween Candy Recipes in the Grimoire

1. 🎃 **Pumpkin Spice Glow Elixir**: 2 Mini Pumpkins + 2x Circle Stir + 1x Vertical Slash.
2. 👁️ **Spooky Eye-Scream Bubble Brew**: 3 Gummy Eyeballs + 1 Ghost Slime + 3x Wand Shake.
3. 🦇 **Bat Wing Midnight Blast**: 2 Bat Wings + 3x Circle Stir + 1x Flick Toss + 1x Spell Thrust.
4. 🌽 **Candy Corn Sugar Rush**: 4 Candy Corn + 2x Circle Stir + 2x Wand Shake.
5. 🧪 **Witch's Ultimate Mega Candy Brew**: The legendary grand witch recipe requiring all ingredients and gestures!
