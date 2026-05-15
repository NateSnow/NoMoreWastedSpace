/**
 * SubmitPanel Component
 *
 * Provides the submission interface for the Gridfinity Drawer Designer.
 * Opens the user's email client with the spec file pre-filled via mailto: link.
 * Collects optional contact info: name, email, phone, address.
 */

import { useState, useCallback } from 'react';
import { useAppState } from '../state/AppStateContext';
import { generateSpecFile } from '../core/SpecFileGenerator';
import { HeightManager } from '../core/HeightManager';
import { GRID_BASE_MM } from '../core/constants';

/** Operator email address where specs are sent. */
const OPERATOR_EMAIL = 'snowmuchfun.events@gmail.com';

export function SubmitPanel() {
  const { state } = useAppState();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { boxes, grid, dimensions, heightConfig } = state;
  const hasBoxes = boxes.length > 0;

  /**
   * Formats the spec file into a readable email body.
   */
  const formatSpecForEmail = useCallback(() => {
    if (!grid || !dimensions) return '';

    const heightManager = new HeightManager(dimensions.height);
    heightManager.setVariableMode(heightConfig.variableMode);
    heightManager.setDefaultHeight(heightConfig.defaultHeight);

    const specFile = generateSpecFile(grid, boxes, heightManager);

    const lines: string[] = [
      '=== Gridfinity Drawer Design Spec ===',
      '',
      '--- Contact Info ---',
      `Name: ${name || '(not provided)'}`,
      `Email: ${email || '(not provided)'}`,
      `Phone: ${phone || '(not provided)'}`,
      `Address: ${address || '(not provided)'}`,
      '',
      '--- Drawer Dimensions ---',
      `Width: ${dimensions.width}mm`,
      `Depth: ${dimensions.depth}mm`,
      `Height: ${Math.floor(dimensions.height / 7)} units (${dimensions.height}mm)`,
      '',
      '--- Baseplate ---',
      `Grid: ${specFile.baseplate.gridWidth} x ${specFile.baseplate.gridDepth} cells (${GRID_BASE_MM}mm base)`,
      `Total size: ${specFile.baseplate.totalWidthMm}mm x ${specFile.baseplate.totalDepthMm}mm`,
      '',
      `--- Boxes (${specFile.boxes.length}) ---`,
    ];

    for (const box of specFile.boxes) {
      const sizeStr = `${box.sizeUnits.width}x${box.sizeUnits.depth}`;
      const posStr = `col:${box.gridPosition.col} row:${box.gridPosition.row}`;
      const mwStr = box.makerWorldModel ? ` [MakerWorld: ${box.makerWorldModel.name}]` : '';
      lines.push(`  Item ${box.itemNumber}: ${sizeStr} at (${posStr}), H:${box.heightUnits}${mwStr}`);
    }

    return lines.join('\n');
  }, [grid, dimensions, boxes, heightConfig, name, email, phone, address]);

  /**
   * Opens the user's email client with the spec pre-filled.
   */
  const handleSubmit = useCallback(() => {
    const body = formatSpecForEmail();
    const subject = encodeURIComponent('Gridfinity Drawer Design Submission');
    const encodedBody = encodeURIComponent(body);

    window.location.href = `mailto:${OPERATOR_EMAIL}?subject=${subject}&body=${encodedBody}`;
    setSubmitted(true);
  }, [formatSpecForEmail]);

  return (
    <section className="submit-panel" aria-label="Submit design">
      <h3>Contact Information</h3>

      {/* Name */}
      <div className="submit-panel__field">
        <label htmlFor="contact-name">Name (optional)</label>
        <input
          id="contact-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
        />
      </div>

      {/* Email */}
      <div className="submit-panel__field">
        <label htmlFor="contact-email">Email (optional)</label>
        <input
          id="contact-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
        />
      </div>

      {/* Phone */}
      <div className="submit-panel__field">
        <label htmlFor="contact-phone">Phone (optional)</label>
        <input
          id="contact-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(555) 123-4567"
        />
      </div>

      {/* Address */}
      <div className="submit-panel__field">
        <label htmlFor="contact-address">Shipping Address (optional)</label>
        <textarea
          id="contact-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Street, City, State, ZIP"
          rows={2}
          style={{ width: '100%', padding: '8px 12px', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box', resize: 'vertical' }}
        />
      </div>

      {/* Submit button */}
      <button
        className="submit-panel__button"
        onClick={handleSubmit}
        disabled={!hasBoxes}
      >
        Submit Design
      </button>

      {/* Disabled reason */}
      {!hasBoxes && (
        <p className="submit-panel__info" role="status">
          Place at least one box before submitting.
        </p>
      )}

      {/* Success confirmation */}
      {submitted && (
        <div className="submit-panel__success" role="status">
          <p>Your email client should have opened with the design spec. Hit send to submit!</p>
        </div>
      )}
    </section>
  );
}
