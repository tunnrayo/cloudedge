/**
 * PORTFOLIO DATA
 *
 * kind: "demo"  = an illustrative concept showing the type of work Cloud Edge can deliver.
 *                 Demo concepts are NOT client projects and are always labelled on the website.
 * kind: "client" = a genuine, completed project. Only add with the client's approval.
 *
 * Demo concepts are hidden on the public site unless the environment variable SHOW_DEMO_PROJECTS=true is set.
 * When real, approved projects exist, add them with kind: "client"; they are always shown.
 */

export type Project = {
  slug: string;
  kind: "demo" | "client";
  title: string;
  sector: string;
  icon: string;
  summary: string;
  challenge: string;
  approach: string;
  features: string[];
  services: string[];
  /** For client projects only. */
  client?: string;
  year?: string;
  link?: string;
  image?: string;
  imageAlt?: string;
};

export const projects: Project[] = [
  {
    slug: "retail-online-store-concept", kind: "demo", title: "Retail Online Store", sector: "Retail & e-commerce", icon: "cart",
    summary: "A concept online store for a fashion and lifestyle retailer that currently sells through chat messages.",
    challenge: "Orders arrive through several chat apps, stock is tracked by hand and customers wait for replies to learn prices.",
    approach: "A searchable catalogue with clear prices, a simple cart and a single order inbox for the team.",
    features: ["Product catalogue with categories", "Cart and order form", "Order inbox for staff", "Mobile-first layout"],
    services: ["ecommerce", "web-development"],
  },
  {
    slug: "clinic-booking-concept", kind: "demo", title: "Clinic Appointment Booking", sector: "Health services", icon: "phone",
    summary: "A concept booking system for a private clinic that takes appointments by phone.",
    challenge: "Phone lines are busy, double bookings happen and patients cannot see available times.",
    approach: "Online booking with available slots, confirmation messages and a schedule view for front-desk staff.",
    features: ["Available-slot booking", "Booking confirmations", "Staff schedule dashboard", "Simple patient records"],
    services: ["application-development", "mobile-app-development"],
  },
  {
    slug: "delivery-tracker-concept", kind: "demo", title: "Delivery Operations Tracker", sector: "Logistics", icon: "chart",
    summary: "A concept dashboard for a small delivery company coordinating riders and orders.",
    challenge: "Dispatch is coordinated through group chats, making it hard to see which orders are pending or late.",
    approach: "A web dashboard showing every order's status, rider assignment and daily performance totals.",
    features: ["Order status board", "Rider assignment", "Daily performance summary", "Exportable reports"],
    services: ["software-development", "application-development"],
  },
];
