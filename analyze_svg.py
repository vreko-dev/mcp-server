#!/usr/bin/env python3
import re
import sys

def analyze_svg_bounds():
    # Current viewBox
    current_viewbox = "-29.27 -28.25 413.25 413.25"
    print(f"Current viewBox: {current_viewbox}")

    # Parse current viewBox
    parts = current_viewbox.split()
    min_x = float(parts[0])
    min_y = float(parts[1])
    width = float(parts[2])
    height = float(parts[3])

    print(f"Current bounds: x=[{min_x}, {min_x + width}], y=[{min_y}, {min_y + height}]")

    # Based on the transformation matrix: matrix(0.403564, 0, 0, 0.403564, -29.266823, -28.25323)
    # Original image: 1024x1024 at (0,0)
    # After scaling: 1024 * 0.403564 = 413.25
    # After translation: starts at (-29.266823, -28.25323)

    scale = 0.403564
    translate_x = -29.266823
    translate_y = -28.25323
    original_size = 1024

    # Calculate actual content bounds
    content_min_x = translate_x
    content_min_y = translate_y
    content_max_x = translate_x + (original_size * scale)
    content_max_y = translate_y + (original_size * scale)

    print(f"Calculated content bounds: x=[{content_min_x}, {content_max_x}], y=[{content_min_y}, {content_max_y}]")

    # Calculate optimal viewBox (with minimal padding)
    optimal_x = content_min_x
    optimal_y = content_min_y
    optimal_width = content_max_x - content_min_x
    optimal_height = content_max_y - content_min_y

    print(f"Optimal viewBox: {optimal_x} {optimal_y} {optimal_width} {optimal_height}")

    # Check if current viewBox has excess whitespace
    current_max_x = min_x + width
    current_max_y = min_y + height

    x_excess = max(0, content_min_x - min_x) + max(0, current_max_x - content_max_x)
    y_excess = max(0, content_min_y - min_y) + max(0, current_max_y - content_max_y)

    print(f"Excess whitespace: x={x_excess:.3f}, y={y_excess:.3f}")

    if x_excess < 0.1 and y_excess < 0.1:
        print("The current viewBox is already optimally cropped!")
        return None
    else:
        return f"{optimal_x} {optimal_y} {optimal_width} {optimal_height}"

if __name__ == "__main__":
    result = analyze_svg_bounds()
    if result:
        print(f"Recommended new viewBox: {result}")
    else:
        print("No optimization needed.")