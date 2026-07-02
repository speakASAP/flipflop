/**
 * Circuit Breaker Service
 * Provides circuit breaker pattern for external service calls
 */

import { Injectable } from '@nestjs/common';
import type CircuitBreaker from 'opossum';
import * as CircuitBreakerModule from 'opossum';
import { getCircuitBreakerConfig } from './resilience.config';

export interface CircuitBreakerOptions {
  timeout?: number;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
  rollingCountTimeout?: number;
  rollingCountBuckets?: number;
}

export interface CircuitBreakerState {
  name: string;
  state: 'open' | 'closed' | 'half-open';
  failures: number;
  successes: number;
  lastFailureTime?: Date;
}

@Injectable()
export class CircuitBreakerService {
  private breakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Create or get a circuit breaker for a service
   */
  create<T>(
    serviceName: string,
    fn: () => Promise<T>,
    options?: CircuitBreakerOptions,
  ): CircuitBreaker {
    // Return existing breaker if it exists
    if (this.breakers.has(serviceName)) {
      return this.breakers.get(serviceName)!;
    }

    // Get configuration
    const config = getCircuitBreakerConfig(serviceName);
    const breakerOptions = {
      timeout: options?.timeout ?? config.timeout,
      errorThresholdPercentage: options?.errorThresholdPercentage ?? config.errorThresholdPercentage,
      resetTimeout: options?.resetTimeout ?? config.resetTimeout,
      rollingCountTimeout: options?.rollingCountTimeout ?? config.rollingCountTimeout,
      rollingCountBuckets: options?.rollingCountBuckets ?? config.rollingCountBuckets,
    };

    // Create circuit breaker. The operation is passed to fire() so a reused
    // breaker keeps its state without capturing stale per-request data.
    const CircuitBreakerCtor = ((CircuitBreakerModule as any).default || CircuitBreakerModule) as any;
    const breaker = new CircuitBreakerCtor(
      async (operation?: () => Promise<T>) => {
        const operationToRun = operation || fn;
        return operationToRun();
      },
      breakerOptions,
    ) as CircuitBreaker;

    // Set up event handlers
    breaker.on('open', () => {
      console.warn(`[CircuitBreaker] ${serviceName} circuit opened`);
    });

    breaker.on('halfOpen', () => {
      console.info(`[CircuitBreaker] ${serviceName} circuit half-open`);
    });

    breaker.on('close', () => {
      console.info(`[CircuitBreaker] ${serviceName} circuit closed`);
    });

    breaker.on('failure', (error: Error) => {
      console.error(`[CircuitBreaker] ${serviceName} failure:`, error.message);
    });

    breaker.on('success', () => {
      console.debug(`[CircuitBreaker] ${serviceName} success`);
    });

    // Store breaker
    this.breakers.set(serviceName, breaker);

    return breaker;
  }

  /**
   * Get circuit breaker state
   */
  getState(serviceName: string): CircuitBreakerState | null {
    const breaker = this.breakers.get(serviceName);
    if (!breaker) {
      return null;
    }

    const stats = breaker.stats;
    return {
      name: serviceName,
      state: breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed',
      failures: stats.failures,
      successes: stats.successes,
      lastFailureTime: stats.failures > 0 ? new Date() : undefined,
    };
  }

  /**
   * Get all circuit breaker states
   */
  getAllStates(): CircuitBreakerState[] {
    const states: CircuitBreakerState[] = [];
    for (const [name, breaker] of this.breakers.entries()) {
      const stats = breaker.stats;
      states.push({
        name,
        state: breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed',
        failures: stats.failures,
        successes: stats.successes,
        lastFailureTime: stats.failures > 0 ? new Date() : undefined,
      });
    }
    return states;
  }

  /**
   * Reset a circuit breaker
   */
  reset(serviceName: string): void {
    const breaker = this.breakers.get(serviceName);
    if (breaker) {
      breaker.close();
    }
  }

  /**
   * Check if circuit breaker is open
   */
  isOpen(serviceName: string): boolean {
    const breaker = this.breakers.get(serviceName);
    return breaker ? breaker.opened : false;
  }
}
