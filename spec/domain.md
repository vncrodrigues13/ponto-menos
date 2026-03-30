# Ponto Menos - Core Domain overview

## 📖 Introduction
**Ponto Menos** is a modern, reliable time-tracking application designed to streamline the way employees record their working hours. The system focuses on simplicity, ensuring that users can easily punch in the start and the end of their daily work journeys from any platform, while providing businesses with an accurate, immutable ledger of time entries.

## 🎯 The Purpose
The primary goal of Ponto Menos is to solve the classic problem of timesheet management. By providing a digital, multi-platform punch-in system, it removes the friction of manual time-tracking. This ensures fairness and transparency for both the employee (ensuring all worked hours are logged) and the employer (maintaining proper governance over work schedules).

---

## 🏗️ Core Domains

The application is built around two primary, interconnected pillars:

### 1. User Management (The Employee)
Every action in the system revolves around an authenticated user. 
- **Identity & Profiles:** Users are identified primarily by their email addresses. The system also tracks their full names, birthdates, and an associated company.
- **Business Rules:** 
  - To maintain compliance with labor standards, users must be at least 18 years old to register. 
  - The system is built with a future-proof **multi-tenant architecture**, meaning every user is explicitly tied to a specific `companyId`. This ensures data boundaries are respected when multiple organizations use the platform.

*For detailed technical specifications, refer to [domain-user.md](./domain-user.md).*

### 2. Time Tracking (The Punch-in)
The core interactive feature of the app is the "Punch-in". A punch-in represents a specific chronological event in an employee's workday—typically marking the beginning, breaks, or the absolute end of their working journey.
- **Event Logging:** Whenever an employee interacts with the system to track time, it generates a secure, timestamped record indicating exactly when the action occurred.
- **Platform Awareness:** Ponto Menos recognizes that modern work happens everywhere. The system explicitly records the platform from which the punch-in originated (e.g., Web, iOS, Android), providing better context to employers.
- **Integrity & Security:** Time entries are tightly bound to the user's secure authentication token, meaning records cannot be easily spoofed or misattributed to another employee. 

*For detailed technical specifications, refer to [domain-punchin.md](./domain-punchin.md).*

---

## 🔒 Security & Observability
While the system is designed to be user-friendly, it maintains strict behind-the-scenes standards:
- **Reliability:** Every significant action (such as registrations or punch-ins) is monitored and logged. This guarantees transparency and allows system administrators to easily audit the platform's health and usage.
- **Data Integrity:** The application rigorously validates all incoming data, safeguarding against impossible scenarios (like a user without a valid email, or a punch-in without a recognized timestamp).



## Test Integrity
Is not allowed that any existing test is removed or edited, add only new tests.
