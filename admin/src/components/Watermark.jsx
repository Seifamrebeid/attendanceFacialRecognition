// Watermark Component
// Displays emblem as watermark on all pages

import React from "react";
import { Box } from "@mui/material";

const Watermark = () => {
  return (
    <Box
      sx={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        opacity: 0.05,
        pointerEvents: "none",
        zIndex: 0,
        width: { xs: 200, sm: 300, md: 400 },
        height: { xs: 200, sm: 300, md: 400 },
      }}
    >
      <img
        src="/emblem.png"
        alt="Watermark"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    </Box>
  );
};

export default Watermark;
