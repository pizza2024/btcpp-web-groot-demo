import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NodeEditModal from './NodeEditModal';

describe('NodeEditModal', () => {
  let container: HTMLDivElement;
  let root: Root;
  let previousActEnvironment: boolean | undefined;

  beforeEach(() => {
    previousActEnvironment = (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT;
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });

  it('returns empty pre/post condition objects when user clears existing conditions', () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    act(() => {
      root.render(
        <NodeEditModal
          nodeId="n_12345678"
          nodeType="MoveTo"
          nodeCategory="Action"
          nodeName="MoveTo"
          ports={{ speed: '1.0' }}
          preconditions={{ _failureIf: '{hp <= 0}' }}
          postconditions={{ _post: '{log("done")}' }}
          onSave={onSave}
          onClose={onClose}
        />
      );
    });

    const clearPreButton = container.querySelector('[data-testid="clear-pre-all"]') as HTMLButtonElement | null;
    const clearPostButton = container.querySelector('[data-testid="clear-post-all"]') as HTMLButtonElement | null;
    expect(clearPreButton).toBeTruthy();
    expect(clearPostButton).toBeTruthy();
    expect(clearPreButton?.disabled).toBe(false);
    expect(clearPostButton?.disabled).toBe(false);

    act(() => {
      clearPreButton!.click();
      clearPostButton!.click();
    });

    const saveButton = container.querySelector('.modal-footer .btn-primary') as HTMLButtonElement | null;
    expect(saveButton).toBeTruthy();

    act(() => {
      saveButton!.click();
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        preconditions: {},
        postconditions: {},
      })
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps local edits when parent re-renders same node with stale condition props', () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    const renderModal = () => {
      root.render(
        <NodeEditModal
          nodeId="n_12345678"
          nodeType="MoveTo"
          nodeCategory="Action"
          nodeName="MoveTo"
          ports={{ speed: '1.0' }}
          preconditions={{ _failureIf: '{hp <= 0}' }}
          postconditions={{ _post: '{log("done")}' }}
          onSave={onSave}
          onClose={onClose}
        />
      );
    };

    act(() => {
      renderModal();
    });

    const clearPreButton = container.querySelector('[data-testid="clear-pre-all"]') as HTMLButtonElement | null;
    const clearPostButton = container.querySelector('[data-testid="clear-post-all"]') as HTMLButtonElement | null;
    expect(clearPreButton).toBeTruthy();
    expect(clearPostButton).toBeTruthy();

    act(() => {
      clearPreButton!.click();
      clearPostButton!.click();
    });

    // Simulate parent component re-rendering the modal with stale values for the same node.
    act(() => {
      renderModal();
    });

    const saveButton = container.querySelector('.modal-footer .btn-primary') as HTMLButtonElement | null;
    expect(saveButton).toBeTruthy();

    act(() => {
      saveButton!.click();
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        preconditions: {},
        postconditions: {},
      })
    );
  });
});
