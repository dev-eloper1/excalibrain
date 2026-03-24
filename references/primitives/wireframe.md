# Wireframe Primitives

Hand-drawn UI components for low-fidelity wireframing. The sketchy Excalidraw aesthetic
signals "draft" — invites feedback, discourages pixel-nitpicking.

## screen
A mobile or desktop frame. Uses a rectangle as the outer boundary.
- **mobile**: 390×780, includes status bar (20px) and title bar (44px)
- **desktop**: 1280×800, includes title bar (32px)
- **tablet**: 768×1024
- Elements: outer rect + status-bar rect + title text

## button
Rounded rectangle with centered label.
- **primary**: filled #3b82f6, white text
- **secondary**: filled #e5e7eb, dark text
- **outline**: no fill, #3b82f6 border
- Default: 120×40

## input
Rectangle with placeholder text and optional label above.
- Border: #d1d5db, fill: white
- Placeholder: gray #9ca3af text
- Label: 12px above, #374151
- Default: 280×40

## textarea
Taller input rectangle for multi-line text.
- Border: #d1d5db, fill: white
- Placeholder: gray #9ca3af text
- Default: 280×120

## card
Rectangle with title and body text.
- Border: #e5e7eb, slight roundness
- Title: 16px bold, body: 14px
- Default width: 280, height auto (min 120)

## nav-bar
Horizontal bar spanning screen width with evenly spaced text items.
- Background: #f9fafb, border-bottom: #e5e7eb
- Items: centered text, 16px, spaced evenly
- Default height: 56

## modal
Overlay rectangle with title, close X, and content area.
- Background: white, border: #d1d5db
- Title: 18px bold, close X top-right
- Default: 320×240, centered

## divider
Horizontal line separator.
- Stroke: #e5e7eb, width 1
- Default width: 280

## image-placeholder
Rectangle with diagonal X cross lines and "image" label.
- Border: #d1d5db dashed-style
- Cross lines corner-to-corner
- Label: centered "image" text, gray
- Default: 200×150

## avatar
Circle (ellipse) with initials text centered.
- Border: #d1d5db, fill: #e5e7eb
- Initials: 14px, centered
- Default: 40×40

## list-item
Horizontal row with optional avatar circle, title, and subtitle.
- Title: 16px #1e1e1e, subtitle: 14px #6b7280
- Optional left avatar circle (32px)
- Default width: 280, height: 64
