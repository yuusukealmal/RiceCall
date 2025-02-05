<div align="center">

# 🎫 RiceCall (Backend)
*RiceCall backend, now written in Rust*

[![Rust](https://img.shields.io/badge/rust-1.83+-93450a.svg?style=flat-square&logo=rust)](https://www.rust-lang.org)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)

</div>

## ✨ Features
- 🌍 **i18n Support**: Available in English and Traditional Chinese
- 還沒想到

## 🚀 Quick Start

1. Clone the repository:

```bash
git clone https://github.com/Nerdy-Home-ReOpen/rc-voice rc-voice-backend
cd rc-voice-backend
git checkout WebSocket
```

2. Configure the server:

```bash
mkdir data
cp config/default.yaml data/config.yaml
# Edit config.yaml with your settings
```

3. Run the server:

```bash
DATABASE_URL=sqlite:data/db.sqlite3 cargo run --release -- -c data/config.yaml --init
```

## 🛠️ Configuration

TBD

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📦 Dependencies

- [axum](https://github.com/tokio-rs/axum) - Web framework
- [sqlx](https://github.com/launchbadge/sqlx) - Async SQL toolkit
- [tokio](https://github.com/tokio-rs/tokio) - Async runtime

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Rust Discord Community](https://discord.gg/rust-lang)

---

<div align="center">

Made with ❤️ and 🦀

</div>