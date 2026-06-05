import React, { useState, useCallback } from 'react';
import { DialogComponent } from '@syncfusion/ej2-react-popups';
import { TextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { RadioButtonComponent } from '@syncfusion/ej2-react-buttons';

interface ExportDialogProps {
  isVisible: boolean;
  onClose: () => void;
  onExport: (fileName: string, format: string) => void;
}

const EXPORT_FORMATS = ['PNG', 'JPG', 'SVG'] as const;
const DEFAULT_FILE_NAME = 'Diagram';

const ExportDialog: React.FC<ExportDialogProps> = ({ isVisible, onClose, onExport }) => {
  const [fileName, setFileName] = useState<string>(DEFAULT_FILE_NAME);
  const [selectedFormat, setSelectedFormat] = useState<string>('PNG');

  const handleExport = useCallback(() => {
    const sanitized = (fileName.trim() || 'diagram').replace(/[^a-zA-Z0-9_-]/g, '_');
    onExport(sanitized, selectedFormat);
    onClose();
  }, [fileName, selectedFormat, onExport, onClose]);

  const getDialogButtons = useCallback(() => [
    { click: handleExport, buttonModel: { content: 'Export', isPrimary: true } },
  ], [handleExport]);

  const renderContent = () => (
    <div style={{ marginTop: '-20px' }}>
      <div>
        <p>File Name</p>
        <TextBoxComponent
          placeholder="Enter file name"
          value={fileName}
          input={(args: any) => setFileName(args.value)}
          floatLabelType="Never"
        />
      </div>
      <div style={{ marginTop: '20px' }}>
        <p>Format</p>
        <div>
          {EXPORT_FORMATS.map((format) => (
            <div key={format} style={{ marginRight: '16px', display: 'inline-block' }}>
              <RadioButtonComponent
                label={format}
                name="exportMode"
                checked={selectedFormat === format}
                change={() => setSelectedFormat(format)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <DialogComponent
      header="Export Options"
      showCloseIcon={true}
      isModal={true}
      visible={isVisible}
      width="300px"
      content={renderContent}
      buttons={getDialogButtons()}
      overlayClick={onClose}
      closeOnEscape={true}
    />
  );
};

export default ExportDialog;
