import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import * as fc from 'fast-check';
import { useNavigationStore, MODULES, type TransitionDirection } from '@/stores/navigation';

// Mock vue-router
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useRoute: () => ({
    path: '/',
  }),
}));

describe('Navigation Store Property Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  // **Feature: ux-global-optimization, Property 1: Navigation Bar Presence and Completeness**
  // *For any* module view (search, galaxy, corridor, interaction, service), the bottom navigation bar SHALL be rendered with exactly 5 module entries.
  // **Validates: Requirements 1.1, 1.4**
  describe('Property 1: Navigation Bar Presence and Completeness', () => {
    it('should have exactly 5 modules defined', () => {
      expect(MODULES.length).toBe(5);
    });

    it('should have all required module properties for any module', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: MODULES.length - 1 }),
          (index) => {
            const module = MODULES[index];
            
            // Each module should have all required properties
            expect(module).toHaveProperty('name');
            expect(module).toHaveProperty('path');
            expect(module).toHaveProperty('icon');
            expect(module).toHaveProperty('label');
            expect(module).toHaveProperty('labelEn');
            
            // Properties should be non-empty strings
            expect(typeof module.name).toBe('string');
            expect(module.name.length).toBeGreaterThan(0);
            expect(typeof module.path).toBe('string');
            expect(module.path.startsWith('/')).toBe(true);
            expect(typeof module.icon).toBe('string');
            expect(module.icon.length).toBeGreaterThan(0);
            expect(typeof module.label).toBe('string');
            expect(module.label.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have unique module names and paths', () => {
      const names = MODULES.map(m => m.name);
      const paths = MODULES.map(m => m.path);
      
      expect(new Set(names).size).toBe(MODULES.length);
      expect(new Set(paths).size).toBe(MODULES.length);
    });

    it('should contain all expected modules', () => {
      const expectedModules = ['search', 'galaxy', 'corridor', 'interaction', 'service'];
      const moduleNames = MODULES.map(m => m.name);
      
      expectedModules.forEach(name => {
        expect(moduleNames).toContain(name);
      });
    });
  });

  // **Feature: ux-global-optimization, Property 2: Direct Module Navigation**
  // *For any* navigation action from the bottom navigation bar to any target module, the router SHALL navigate directly to the target module path.
  // **Validates: Requirements 1.2**
  describe('Property 2: Direct Module Navigation', () => {
    it('should navigate to correct path for any module', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...MODULES.map(m => m.name)),
          (moduleName) => {
            // Arrange
            setActivePinia(createPinia());
            const store = useNavigationStore();
            const mockRouter = { push: vi.fn() };
            
            // Act
            store.navigateTo(moduleName, mockRouter as any);
            
            // Assert
            const expectedModule = MODULES.find(m => m.name === moduleName);
            expect(mockRouter.push).toHaveBeenCalledWith(expectedModule?.path);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should update current module state on navigation', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...MODULES.map(m => m.name)),
          (moduleName) => {
            // Arrange
            setActivePinia(createPinia());
            const store = useNavigationStore();
            
            // Act
            store.navigateTo(moduleName);
            
            // Assert
            expect(store.currentModule).toBe(moduleName);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should track previous module on navigation', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.constantFrom(...MODULES.map(m => m.name)),
            fc.constantFrom(...MODULES.map(m => m.name))
          ).filter(([a, b]) => a !== b),
          ([firstModule, secondModule]) => {
            // Arrange
            setActivePinia(createPinia());
            const store = useNavigationStore();
            
            // Act
            store.navigateTo(firstModule);
            store.navigateTo(secondModule);
            
            // Assert
            expect(store.currentModule).toBe(secondModule);
            expect(store.previousModule).toBe(firstModule);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should calculate correct transition direction', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.integer({ min: 0, max: MODULES.length - 1 }),
            fc.integer({ min: 0, max: MODULES.length - 1 })
          ).filter(([a, b]) => a !== b),
          ([fromIndex, toIndex]) => {
            // Arrange
            setActivePinia(createPinia());
            const store = useNavigationStore();
            const fromModule = MODULES[fromIndex].name;
            const toModule = MODULES[toIndex].name;
            
            // Act
            store.navigateTo(fromModule);
            store.navigateTo(toModule);
            
            // Assert
            const expectedDirection: TransitionDirection = toIndex > fromIndex ? 'left' : 'right';
            expect(store.transitionDirection).toBe(expectedDirection);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Additional navigation tests
  describe('Navigation Edge Cases', () => {
    it('should not navigate for invalid module name', () => {
      // Arrange
      const store = useNavigationStore();
      const mockRouter = { push: vi.fn() };
      
      // Act
      store.navigateTo('invalid-module', mockRouter as any);
      
      // Assert
      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    it('should navigate to home with skipScreensaver flag', () => {
      // Arrange
      const store = useNavigationStore();
      const mockRouter = { push: vi.fn() };
      store.navigateTo('search');
      
      // Act
      store.navigateToHome(mockRouter as any, true);
      
      // Assert
      expect(mockRouter.push).toHaveBeenCalledWith({
        path: '/',
        query: { skipScreensaver: 'true' }
      });
      expect(store.currentModule).toBe('');
    });

    it('should initialize from route path correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...MODULES.map(m => m.path)),
          (path) => {
            // Arrange
            setActivePinia(createPinia());
            const store = useNavigationStore();
            
            // Act
            store.initFromRoute(path);
            
            // Assert
            const expectedModule = MODULES.find(m => m.path === path);
            expect(store.currentModule).toBe(expectedModule?.name);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return correct module by path', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...MODULES.map(m => m.path)),
          (path) => {
            // Arrange
            setActivePinia(createPinia());
            const store = useNavigationStore();
            
            // Act
            const module = store.getModuleByPath(path);
            
            // Assert
            expect(module).not.toBeNull();
            expect(module?.path).toBe(path);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
