# FinalDream

<div align="center">
<img src="./resources/icon.png" width="30%"/>
</div>

![MacOS](https://img.shields.io/badge/Support-MacOS-blue?logo=Apple&style=flat-square)
![Windows](https://img.shields.io/badge/Support-Windows-blue?logo=Windows&style=flat-square)
![Linux](https://img.shields.io/badge/Support-Linux-blue?logo=Linux&style=flat-square)
![License](https://img.shields.io/github/license/EutropicAI/FinalDream?style=flat-square)

**One last step for your dreams.**

FinalDream is a cross-platform GUI for **[zimage-ncnn-vulkan](https://github.com/nihui/zimage-ncnn-vulkan)**, enabling local, high-performance AI image generation on your desktop.

### Screenshots

<div align="center">
<!-- Insert screenshots here -->
</div>

### Installation

#### [Download the latest release from here.](https://github.com/EutropicAI/FinalDream/releases)

#### Windows

Download and run the installer (`.exe`) from the releases page.

#### MacOS

Download the `.dmg` file.

```bash
sudo spctl --master-disable
# Disable Gatekeeper, then allow applications downloaded from anywhere in System Preferences > Security & Privacy > General
xattr -cr /Applications/FinalDream.app
```

For the first run, you may need to execute the commands above in the terminal to allow the app to run due to Apple's security restrictions on unsigned apps.

#### Linux

Ensure you have the necessary dependencies installed for Electron apps.

### Backend

This project depends on the amazing work by **nihui**:

- **[zimage-ncnn-vulkan](https://github.com/nihui/zimage-ncnn-vulkan)**

### Tech Stack

- [Electron-Vite](https://github.com/alex8088/electron-vite)
- [Naive UI](https://github.com/tusen-ai/naive-ui)
- [Vue 3](https://vuejs.org/)

### License

This project is open source. Please check the `LICENSE` file for details.

### Acknowledgements

<a href="https://star-history.com/#EutropicAI/FinalDream&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=EutropicAI/FinalDream&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=EutropicAI/FinalDream&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=EutropicAI/FinalDream&type=Date" />
  </picture>
</a>
