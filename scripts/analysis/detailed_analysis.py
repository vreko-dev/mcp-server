#!/usr/bin/env python3
import re
import base64
from PIL import Image
import io

def analyze_embedded_png():
    """Extract and analyze the embedded PNG to find actual content bounds"""

    # Read the SVG file
    with open('/Users/user1/WebstormProjects/SnapBack-Site/apps/web/public/images/snapback-glass-cropped.svg', 'r') as f:
        svg_content = f.read()

    # Extract the base64 PNG data
    pattern = r'data:image/png;base64,([^"]*)'
    match = re.search(pattern, svg_content)

    if not match:
        print("No embedded PNG found")
        return

    base64_data = match.group(1)

    try:
        # Decode the base64 data
        png_data = base64.b64decode(base64_data)

        # Open the image
        img = Image.open(io.BytesIO(png_data))

        print(f"PNG dimensions: {img.size}")
        print(f"PNG mode: {img.mode}")

        # Convert to RGBA if needed to check for transparency
        if img.mode != 'RGBA':
            img = img.convert('RGBA')

        # Get image data as array
        pixels = img.load()
        width, height = img.size

        # Find bounding box of non-transparent pixels
        min_x, min_y = width, height
        max_x, max_y = -1, -1

        for y in range(height):
            for x in range(width):
                r, g, b, a = pixels[x, y]
                if a > 0:  # Non-transparent pixel
                    min_x = min(min_x, x)
                    min_y = min(min_y, y)
                    max_x = max(max_x, x)
                    max_y = max(max_y, y)

        if max_x >= min_x and max_y >= min_y:
            content_width = max_x - min_x + 1
            content_height = max_y - min_y + 1

            print(f"Content bounds in PNG: x=[{min_x}, {max_x}], y=[{min_y}, {max_y}]")
            print(f"Content size: {content_width} x {content_height}")

            # Calculate padding
            left_padding = min_x
            right_padding = width - max_x - 1
            top_padding = min_y
            bottom_padding = height - max_y - 1

            print(f"Padding: left={left_padding}, right={right_padding}, top={top_padding}, bottom={bottom_padding}")

            if left_padding > 0 or right_padding > 0 or top_padding > 0 or bottom_padding > 0:
                print("PNG contains transparent padding that could be optimized!")

                # Calculate new SVG viewBox accounting for PNG padding
                scale = 0.403564
                translate_x = -29.266823
                translate_y = -28.25323

                # Adjust for PNG padding
                new_min_x = translate_x + (left_padding * scale)
                new_min_y = translate_y + (top_padding * scale)
                new_width = content_width * scale
                new_height = content_height * scale

                print(f"Optimized viewBox: {new_min_x} {new_min_y} {new_width} {new_height}")
                return f"{new_min_x} {new_min_y} {new_width} {new_height}"
            else:
                print("PNG content fills the entire image - no further optimization possible")
        else:
            print("No visible content found in PNG")

    except Exception as e:
        print(f"Error analyzing PNG: {e}")

    return None

if __name__ == "__main__":
    result = analyze_embedded_png()
    if result:
        print(f"Recommended optimized viewBox: {result}")
    else:
        print("No further optimization possible.")