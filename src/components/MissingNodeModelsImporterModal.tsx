import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBTStore } from '../store/BTStoreProvider';
import type { BTNodeCategory, BTNodeDefinition, BTPort, PortDirection } from '../types/bt';
import { validateNodeModel } from '../utils/btXml';
import type { MissingNodeModelCandidate } from '../utils/btXml';

interface MissingNodeModelsImporterModalProps {
  candidates: MissingNodeModelCandidate[];
  onClose: () => void;
}

interface PortFormState {
  name: string;
  direction: PortDirection;
}

const MissingNodeModelsImporterModal: React.FC<MissingNodeModelsImporterModalProps> = ({ candidates, onClose }) => {
  const { t } = useTranslation();
  const { project, replaceNodeModel } = useBTStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nodeType, setNodeType] = useState('');
  const [category, setCategory] = useState<BTNodeCategory>('Action');
  const [ports, setPorts] = useState<PortFormState[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const currentCandidate = candidates[currentIndex] ?? null;
  const isLastCandidate = currentIndex >= candidates.length - 1;

  useEffect(() => {
    if (!currentCandidate) return;
    setNodeType(currentCandidate.type);
    setCategory(currentCandidate.category);
    setPorts(currentCandidate.ports.map((port) => ({ name: port.name, direction: port.direction })));
    setValidationErrors([]);
  }, [currentCandidate]);

  const existingModels = useMemo(
    () => project.nodeModels.filter((model) => model.type !== currentCandidate?.type),
    [currentCandidate?.type, project.nodeModels]
  );

  const advance = () => {
    if (isLastCandidate) {
      onClose();
      return;
    }
    setCurrentIndex((index) => index + 1);
  };

  const handleSkip = () => {
    advance();
  };

  const handleSave = () => {
    if (!currentCandidate) return;

    const validPorts: BTPort[] = ports
      .filter((port) => port.name.trim())
      .map((port) => ({ name: port.name.trim(), direction: port.direction }));

    const def: BTNodeDefinition = {
      type: nodeType.trim(),
      category,
      ports: validPorts.length > 0 ? validPorts : undefined,
    };

    const issues = validateNodeModel(def, existingModels);
    const errors = issues.filter((issue) => issue.severity === 'error');
    if (errors.length > 0) {
      setValidationErrors(errors.map((issue) => issue.message));
      return;
    }

    setValidationErrors([]);
    replaceNodeModel(currentCandidate.type, def);
    advance();
  };

  const handlePortChange = (index: number, field: keyof PortFormState, value: string) => {
    setPorts((prev) => prev.map((port, portIndex) => (
      portIndex === index ? { ...port, [field]: value } : port
    )));
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!currentCandidate) return null;

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content imported-models-modal">
        <div className="modal-header">
          <div className="modal-title">
            <span>{t('importedModels.title')}</span>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="imported-models-summary">
            {t('importedModels.missingMessage', { type: currentCandidate.type })}
          </div>
          <div className="importer-topline">
            <button type="button" className="importer-type-pill">{currentCandidate.type}</button>
          </div>
          <div className="imported-models-summary">{t('importedModels.helper')}</div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>{t('importedModels.typeLabel')}</label>
              <input
                type="text"
                value={nodeType}
                onChange={(e) => setNodeType(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="importer-grid">
            <div className="importer-category-column">
              <div className="form-group">
                <label>Category</label>
                {currentCandidate.categoryOptions.map((option) => (
                  <label key={option} className="importer-category-option">
                    <input
                      type="radio"
                      name="missing-model-category"
                      checked={category === option}
                      onChange={() => setCategory(option)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="importer-ports-column">
              <div className="form-group">
                <label>{t('importedModels.portsLabel')}</label>
                {ports.length > 0 ? (
                  <table className="importer-ports-table">
                    <thead>
                      <tr>
                        <th>Direction</th>
                        <th>Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ports.map((port, index) => (
                        <tr key={`${port.name}-${index}`}>
                          <td>
                            <select
                              value={port.direction}
                              onChange={(e) => handlePortChange(index, 'direction', e.target.value)}
                            >
                              <option value="input">Input</option>
                              <option value="output">Output</option>
                              <option value="inout">InOut</option>
                            </select>
                          </td>
                          <td>
                            <input
                              type="text"
                              value={port.name}
                              onChange={(e) => handlePortChange(index, 'name', e.target.value)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="imported-models-summary">{t('importedModels.noPorts')}</div>
                )}
              </div>
            </div>
          </div>

          {validationErrors.length > 0 && (
            <div className="validation-errors">
              {validationErrors.map((error, index) => (
                <div key={index} className="validation-error-item">⚠ {error}</div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="importer-progress">{t('importedModels.progress', { current: currentIndex + 1, total: candidates.length })}</div>
          <button className="btn-secondary" onClick={handleSkip}>{t('importedModels.skip')}</button>
          <button className="btn-primary" onClick={handleSave}>
            {isLastCandidate ? t('importedModels.save') : t('importedModels.saveAndNext')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MissingNodeModelsImporterModal;