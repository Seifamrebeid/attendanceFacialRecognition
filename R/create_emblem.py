import cv2
import numpy as np

# Create emblem image (200x200 with alpha channel)
emblem = np.zeros((200, 200, 4), dtype=np.uint8)

# Background - transparent (all zeros)
emblem[:, :, 3] = 0

# Draw cyan circle border (bright cyan: 0, 200, 255 in BGR, 255 alpha)
cv2.circle(emblem, (100, 100), 95, (0, 200, 255, 255), 3)

# Draw AAST text in center
font = cv2.FONT_HERSHEY_SIMPLEX
text = "AAST"
font_scale = 1.5
thickness = 3
text_size = cv2.getTextSize(text, font, font_scale, thickness)[0]
text_x = (200 - text_size[0]) // 2
text_y = (200 + text_size[1]) // 2

# Write text in bright cyan
cv2.putText(emblem, text, (text_x, text_y), font, font_scale, (0, 200, 255, 255), thickness)

# Add a small decorative line
cv2.line(emblem, (50, 150), (150, 150), (0, 255, 200, 255), 2)

# Save as PNG with alpha channel
cv2.imwrite("emblem.png", emblem)
print("✅ emblem.png created successfully!")
