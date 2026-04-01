import React from "react";
import { motion } from "framer-motion";

const features = [
  {
    title: "Best Price Guarantee",
    description: "Transparent pricing with no hidden fees on every booking."
  },
  {
    title: "24/7 Concierge",
    description: "Dedicated travel experts available around the clock."
  },
  {
    title: "Luxury Verified",
    description:
      "Every property is vetted for service, design, and experience."
  },
  {
    title: "Flexible Cancellation",
    description:
      "Choose from refundable rates tailored to your travel plans."
  }
];

function WhyLuxeStay() {
  return (
    <section className="bg-white py-12 sm:py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-8">
          <h2 className="font-heading text-2xl sm:text-3xl text-primary mb-2">
            Why book with LuxeStayHaven
          </h2>
          <p className="text-textMedium text-sm">
            A curated collection of luxury hotels, combined with seamless
            technology and human support.
          </p>
        </div>

        <motion.div
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: 0.07 }
            }
          }}
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0 }
              }}
              className="rounded-xl border border-slate-100 bg-background px-4 py-5 shadow-sm"
            >
              <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-xs font-semibold text-accent mb-3">
                ★
              </div>
              <div className="font-medium text-textDark mb-1 text-sm">
                {feature.title}
              </div>
              <p className="text-xs text-textMedium">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export default WhyLuxeStay;

