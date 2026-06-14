"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function HeroAnimation() {
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    // Hide the intro after 4.2 seconds
    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 4200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {showIntro && (
        <motion.div
          key="intro-overlay"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "#080808",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {/* 1. The Quail Chick (𓅱) flying in */}
          <motion.div
            initial={{ x: "-60vw", y: "15vh", opacity: 0, scale: 0.6, rotate: -20 }}
            animate={{ 
              x: [ "-60vw", "0vw", "5vw" ], 
              y: [ "15vh", "-5vh", "0vh" ],
              opacity: [ 0, 1, 0 ], 
              scale: [ 0.6, 1.2, 2.5 ],
              rotate: [ -20, 0, 15 ],
              filter: [ "blur(8px)", "blur(0px)", "blur(12px)" ]
            }}
            transition={{
              duration: 2.8,
              times: [0, 0.6, 1],
              ease: [0.25, 0.1, 0.25, 1], // Smooth cubic bezier
            }}
            style={{
              position: "absolute",
              fontSize: "140px",
              color: "#25D366", // WhatsApp Green
              textShadow: "0 0 40px rgba(37,211,102,0.6)",
              lineHeight: 1,
            }}
          >
            𓅱
          </motion.div>

          {/* 2. Central Burst Glow (Morphing effect) */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 0, 1, 0], 
              scale: [0, 0, 1.5, 4] 
            }}
            transition={{
              duration: 3.2,
              times: [0, 0.5, 0.65, 1],
              ease: "easeOut",
            }}
            style={{
              position: "absolute",
              width: "300px",
              height: "300px",
              background: "radial-gradient(circle, rgba(37,211,102,0.5) 0%, rgba(8,8,8,0) 70%)",
              borderRadius: "50%",
              mixBlendMode: "screen",
              pointerEvents: "none",
            }}
          />

          {/* 3. The Wani Logo Reveal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.4, filter: "blur(20px)" }}
            animate={{ 
              opacity: [0, 0, 1, 1], 
              scale: [0.4, 0.4, 1.1, 1], 
              filter: ["blur(20px)", "blur(20px)", "blur(0px)", "blur(0px)"] 
            }}
            transition={{
              duration: 3.8,
              times: [0, 0.5, 0.7, 1],
              ease: "easeOut",
            }}
            style={{
              position: "absolute",
              width: "160px",
              height: "160px",
              borderRadius: "36px", 
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)",
              background: "#0a0a0a",
            }}
          >
            <img 
              src="/wani.svg" 
              alt="Wani Logo" 
              style={{ 
                width: "100%", 
                height: "100%", 
                objectFit: "cover",
                transform: "scale(1.02)" 
              }} 
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
