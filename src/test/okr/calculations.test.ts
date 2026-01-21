import { describe, it, expect } from 'vitest';
import {
    calculateKeyResultProgress,
    KeyResultType,
    KeyResultDirection,
    KeyResultStatus
} from '../../../components/okr/types/okr.types';

describe('calculateKeyResultProgress', () => {
    it('should calculate numeric progress correctly (default/old logic)', () => {
        // 0 -> 100, current 50 = 50%
        const kr = {
            type: KeyResultType.NUMERIC,
            status: KeyResultStatus.YELLOW,
            start_value: 0,
            target_value: 100,
            current_value: 50,
            title: 'Teste'
        };

        // @ts-ignore
        const result = calculateKeyResultProgress(kr);
        expect(result.percentage).toBe(50);
    });

    it('should handle zero target in default logic', () => {
        const kr = {
            type: KeyResultType.NUMERIC,
            status: KeyResultStatus.YELLOW,
            start_value: 0,
            target_value: 0,
            current_value: 10,
            title: 'Teste'
        };

        // @ts-ignore
        const result = calculateKeyResultProgress(kr);
        expect(result.percentage).toBe(0); // Should be 0 to avoid division by zero or NaN issues
    });

    it('should calculate increase direction correctly', () => {
        const kr = {
            type: KeyResultType.NUMERIC,
            status: KeyResultStatus.YELLOW,
            direction: KeyResultDirection.INCREASE,
            start_value: 10,
            target_value: 110,
            current_value: 60, // (60-10)/(110-10) = 50/100 = 50%
            title: 'Teste'
        };

        // @ts-ignore
        const result = calculateKeyResultProgress(kr);
        expect(result.percentage).toBe(50);
    });

    it('should calculate decrease direction correctly', () => {
        const kr = {
            type: KeyResultType.NUMERIC,
            status: KeyResultStatus.YELLOW,
            direction: KeyResultDirection.DECREASE,
            start_value: 100,
            target_value: 0,
            current_value: 50, // (100-50)/(100-0) = 50/100 = 50%
            title: 'Teste'
        };

        // @ts-ignore
        const result = calculateKeyResultProgress(kr);
        expect(result.percentage).toBe(50);
    });

    it('should handle activity type', () => {
        const kr = {
            type: KeyResultType.ACTIVITY,
            status: KeyResultStatus.YELLOW,
            activity_done: true,
            title: 'Teste Activity'
        };

        // @ts-ignore
        const result = calculateKeyResultProgress(kr);
        expect(result.percentage).toBe(100);
    });

    it('should cap percentage at 100%', () => {
        const kr = {
            type: KeyResultType.NUMERIC,
            status: KeyResultStatus.YELLOW,
            start_value: 0,
            target_value: 100,
            current_value: 150,
            title: 'Teste'
        };
        // @ts-ignore
        const result = calculateKeyResultProgress(kr);
        expect(result.percentage).toBe(100);
    });

    it('should floor percentage at 0%', () => {
        const kr = {
            type: KeyResultType.NUMERIC,
            status: KeyResultStatus.YELLOW,
            start_value: 0,
            target_value: 100,
            current_value: -10,
            title: 'Teste'
        };
        // @ts-ignore
        const result = calculateKeyResultProgress(kr);
        expect(result.percentage).toBe(0);
    });
});
