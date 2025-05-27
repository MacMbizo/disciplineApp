# MCC Discipline Tracker

[![GitHub license](https://img.shields.io/github/license/MacMbizo/disciplineApp)](https://github.com/MacMbizo/disciplineApp/blob/master/LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/MacMbizo/disciplineApp)](https://github.com/MacMbizo/disciplineApp/issues)
[![GitHub stars](https://img.shields.io/github/stars/MacMbizo/disciplineApp)](https://github.com/MacMbizo/disciplineApp/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/MacMbizo/disciplineApp)](https://github.com/MacMbizo/disciplineApp/network)
[![CI](https://github.com/MacMbizo/disciplineApp/actions/workflows/ci.yml/badge.svg)](https://github.com/MacMbizo/disciplineApp/actions)

## Overview

MCC Discipline Tracker is a role-based discipline management system for schools, built with React Native, Expo, Firebase, and TypeScript. It supports admin, teacher, student, and parent workflows with secure authentication and real-time data.

## Features
- Role-based navigation (Admin, Teacher, Student, Parent)
- Firebase authentication and Firestore integration
- Modular service layer architecture
- Theming and accessibility support
- Comprehensive testing and CI setup

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- Yarn or npm
- Expo CLI (`npm install -g expo-cli`)

### Installation
```bash
git clone https://github.com/MacMbizo/disciplineApp.git
cd disciplineApp
npm install # or yarn install
```

### Running the App
```bash
expo start
```

## Project Structure
- `src/navigation/` - Navigation configuration
- `src/screens/` - Screen components by role
- `src/services/` - Service layer for business logic
- `src/contexts/` - Context providers (e.g., AuthContext)
- `src/config/` - Theme and environment config

## Contributing
Contributions are welcome! Please open issues and submit pull requests. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Maintainers
- [MacMbizo](https://github.com/MacMbizo)

## Acknowledgements
- Expo, React Native, Firebase, TypeScript
- All contributors and testers