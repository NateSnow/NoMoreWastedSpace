/**
 * Submission Manager
 *
 * Handles submitting spec files to the Operator via the /api/submit endpoint.
 * Tracks consecutive failures and enforces a cooldown period after 3 failures.
 */

import {
  SUBMIT_TIMEOUT_MS,
  MAX_SUBMIT_RETRIES,
  SUBMIT_COOLDOWN_MS,
} from '../core/constants';
import type { SpecFile } from '../core/types';

/** Result of a submission attempt. */
export interface SubmitResult {
  /** Whether the submission succeeded. */
  success: boolean;
  /** Operator email address (on success). */
  operatorEmail?: string;
  /** Error message (on failure). */
  error?: string;
}

/**
 * Manages spec file submissions to the Operator.
 *
 * Tracks consecutive failures and disables submission for a cooldown period
 * after MAX_SUBMIT_RETRIES consecutive failures.
 */
export class SubmissionManager {
  private readonly baseUrl: string;
  private consecutiveFailures: number = 0;
  private cooldownUntil: number | null = null;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Submit a spec file and contact email to the Operator.
   *
   * POSTs JSON body { specFile, contactEmail } to /api/submit with a 30s timeout.
   * On success, resets the failure count and returns the operator email.
   * On failure, increments the failure count. After 3 consecutive failures,
   * enters a 60-second cooldown during which submissions are disabled.
   *
   * @param specFile - The generated spec file to submit.
   * @param contactEmail - The user's contact email address.
   * @returns A SubmitResult indicating success or failure.
   */
  async submit(specFile: SpecFile, contactEmail: string): Promise<SubmitResult> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);

      const response = await fetch(`${this.baseUrl}/api/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specFile, contactEmail }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return this.handleFailure('Submission failed — please try again');
      }

      const data = await response.json();

      // Success: reset failure count
      this.consecutiveFailures = 0;
      this.cooldownUntil = null;

      return {
        success: true,
        operatorEmail: data.operatorEmail,
      };
    } catch (error: unknown) {
      if (
        (error instanceof Error && error.name === 'AbortError') ||
        (typeof error === 'object' &&
          error !== null &&
          'name' in error &&
          (error as { name: string }).name === 'AbortError')
      ) {
        return this.handleFailure('Submission timed out — please try again');
      }

      return this.handleFailure('Submission failed — please try again');
    }
  }

  /**
   * Check whether submission is currently allowed.
   *
   * Returns true if boxCount >= 1 AND the cooldown period is not active.
   *
   * @param boxCount - The number of boxes in the current layout.
   * @returns Whether the submit action should be enabled.
   */
  canSubmit(boxCount: number): boolean {
    if (boxCount < 1) {
      return false;
    }

    if (this.cooldownUntil !== null && Date.now() < this.cooldownUntil) {
      return false;
    }

    // Cooldown has expired — clear it
    if (this.cooldownUntil !== null && Date.now() >= this.cooldownUntil) {
      this.cooldownUntil = null;
    }

    return true;
  }

  /** Returns the current consecutive failure count (for testing/state inspection). */
  getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }

  /** Returns the cooldown expiry timestamp, or null if not in cooldown. */
  getCooldownUntil(): number | null {
    return this.cooldownUntil;
  }

  /**
   * Handle a submission failure: increment failure count and activate cooldown
   * if the threshold is reached.
   */
  private handleFailure(errorMessage: string): SubmitResult {
    this.consecutiveFailures++;

    if (this.consecutiveFailures >= MAX_SUBMIT_RETRIES) {
      this.cooldownUntil = Date.now() + SUBMIT_COOLDOWN_MS;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}
