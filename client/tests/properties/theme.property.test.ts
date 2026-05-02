import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import * as fc from 'fast-check';
import { useThemeStore, STORAGE_KEY, darkThemeVariables, lightThemeVariables, type ThemeMode } from '@/stores/theme';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock document.documentElement
const mockRoot = {
  style: {
    setProperty: vi.fn(),
  },
  classList: {
    add: vi.fn(),
    remove: vi.fn(),
  },
};

Object.defineProperty(document, 'documentElement', {
  value: mockRoot,
  writable: true,
});

describe('Theme Store Property Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // **Feature: ux-global-optimization, Property 7: Theme Persistence Round-Trip**
  // *For any* theme value ('dark' or 'light'), saving to localStorage and then loading SHALL return the same theme value.
  // **Validates: Requirements 5.3, 5.4**
  describe('Property 7: Theme Persistence Round-Trip', () => {
    it('should persist and restore theme correctly for any valid theme mode', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<ThemeMode>('dark', 'light'),
          (themeMode) => {
            // Arrange
            const store = useThemeStore();
            
            // Act - Save theme
            store.setTheme(themeMode);
            
            // Create new store instance to simulate app restart
            setActivePinia(createPinia());
            const newStore = useThemeStore();
            newStore.loadFromStorage();
            
            // Assert - Theme should be restored
            expect(newStore.mode).toBe(themeMode);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle localStorage read/write correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<ThemeMode>('dark', 'light'),
          (themeMode) => {
            // Arrange
            localStorageMock.clear();
            const store = useThemeStore();
            
            // Act
            store.setTheme(themeMode);
            
            // Assert - localStorage should contain the theme
            expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, themeMode);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Feature: ux-global-optimization, Property 8: Theme Toggle Alternation**
  // *For any* current theme state, calling toggleTheme() SHALL switch to the opposite theme ('dark' ↔ 'light').
  // **Validates: Requirements 5.1**
  describe('Property 8: Theme Toggle Alternation', () => {
    it('should toggle between dark and light themes', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<ThemeMode>('dark', 'light'),
          (initialTheme) => {
            // Arrange
            setActivePinia(createPinia());
            const store = useThemeStore();
            store.setTheme(initialTheme);
            
            // Act
            store.toggleTheme();
            
            // Assert - Theme should be opposite
            const expectedTheme = initialTheme === 'dark' ? 'light' : 'dark';
            expect(store.mode).toBe(expectedTheme);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return to original theme after double toggle', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<ThemeMode>('dark', 'light'),
          (initialTheme) => {
            // Arrange
            setActivePinia(createPinia());
            const store = useThemeStore();
            store.setTheme(initialTheme);
            
            // Act - Toggle twice
            store.toggleTheme();
            store.toggleTheme();
            
            // Assert - Should be back to original
            expect(store.mode).toBe(initialTheme);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Feature: ux-global-optimization, Property 9: Theme CSS Variables Consistency**
  // *For any* theme mode, all CSS variables defined in ThemeVariables interface SHALL be set on the document root element with valid color values.
  // **Validates: Requirements 5.5, 5.6**
  describe('Property 9: Theme CSS Variables Consistency', () => {
    it('should apply all CSS variables for any theme mode', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<ThemeMode>('dark', 'light'),
          (themeMode) => {
            // Arrange
            setActivePinia(createPinia());
            vi.clearAllMocks();
            const store = useThemeStore();
            
            // Act
            store.setTheme(themeMode);
            
            // Assert - All variables should be set
            const expectedVariables = themeMode === 'dark' ? darkThemeVariables : lightThemeVariables;
            const variableKeys = Object.keys(expectedVariables);
            
            // Check that setProperty was called for each variable
            variableKeys.forEach(key => {
              expect(mockRoot.style.setProperty).toHaveBeenCalledWith(key, expectedVariables[key]);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have valid color values for all CSS variables', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<ThemeMode>('dark', 'light'),
          (themeMode) => {
            // Arrange
            setActivePinia(createPinia());
            const store = useThemeStore();
            store.setTheme(themeMode);
            
            // Assert - All values should be valid CSS color strings
            const variables = store.cssVariables;
            Object.values(variables).forEach(value => {
              // Check that value is a non-empty string
              expect(typeof value).toBe('string');
              expect(value.length).toBeGreaterThan(0);
              // Check that value looks like a valid CSS color (hex, rgb, rgba)
              const isValidColor = /^(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))$/.test(value);
              expect(isValidColor).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should add correct theme class to document root', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<ThemeMode>('dark', 'light'),
          (themeMode) => {
            // Arrange
            setActivePinia(createPinia());
            vi.clearAllMocks();
            const store = useThemeStore();
            
            // Act
            store.setTheme(themeMode);
            
            // Assert - Correct class should be added
            expect(mockRoot.classList.remove).toHaveBeenCalledWith('theme-dark', 'theme-light');
            expect(mockRoot.classList.add).toHaveBeenCalledWith(`theme-${themeMode}`);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Additional edge case tests
  describe('Edge Cases', () => {
    it('should fallback to dark theme for invalid stored values', () => {
      // Arrange
      localStorageMock.getItem.mockReturnValue('invalid-theme');
      setActivePinia(createPinia());
      const store = useThemeStore();
      
      // Act
      store.loadFromStorage();
      
      // Assert
      expect(store.mode).toBe('dark');
    });

    it('should fallback to dark theme when localStorage is empty', () => {
      // Arrange
      localStorageMock.getItem.mockReturnValue(null);
      setActivePinia(createPinia());
      const store = useThemeStore();
      
      // Act
      store.loadFromStorage();
      
      // Assert
      expect(store.mode).toBe('dark');
    });

    it('should handle setTheme with invalid value by falling back to dark', () => {
      // Arrange
      setActivePinia(createPinia());
      const store = useThemeStore();
      
      // Act
      store.setTheme('invalid' as ThemeMode);
      
      // Assert
      expect(store.mode).toBe('dark');
    });
  });
});
