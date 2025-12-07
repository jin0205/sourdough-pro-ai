import React, { useRef, useState } from 'react';
import { dataManagementService } from '../services/dataManagementService';

interface DataSettingsProps {
    onClose: () => void;
}

const DataSettings: React.FC<DataSettingsProps> = ({ onClose }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleExport = () => {
        dataManagementService.exportData();
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            await dataManagementService.importData(file);
            setImportStatus('success');
            setTimeout(() => {
                setImportStatus('idle');
                onClose();
            }, 1500);
        } catch (error: any) {
            setImportStatus('error');
            setErrorMessage(error.message || 'Failed to import data');
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md m-4 relative">
                <button
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute top-4 right-4 text-stone-400 hover:text-stone-600"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                <h3 className="text-xl font-bold text-stone-800 mb-2">Data Management</h3>
                <p className="text-stone-500 text-sm mb-6">
                    Backup your recipes and inventory to a file, or restore from a previous backup.
                </p>

                <div className="space-y-4">
                    <div className="p-4 bg-stone-50 rounded-lg border border-stone-200">
                        <h4 className="font-semibold text-stone-700 mb-1">Export Backup</h4>
                        <p className="text-xs text-stone-500 mb-3">Download a JSON file containing all your data.</p>
                        <button
                            onClick={handleExport}
                            className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-white border border-stone-300 rounded-md text-stone-700 hover:bg-stone-50 font-medium text-sm transition-colors shadow-sm"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Download Backup
                        </button>
                    </div>

                    <div className="p-4 bg-stone-50 rounded-lg border border-stone-200">
                        <h4 className="font-semibold text-stone-700 mb-1">Import Backup</h4>
                        <p className="text-xs text-stone-500 mb-3">Restore data from a previously exported file. Warning: This overwrites current data.</p>
                        <input
                            type="file"
                            accept=".json"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <button
                            onClick={handleImportClick}
                            className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-amber-600 border border-transparent rounded-md text-white hover:bg-amber-700 font-medium text-sm transition-colors shadow-sm"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            Upload Backup File
                        </button>

                        {importStatus === 'success' && (
                            <div className="mt-3 text-sm text-green-600 flex items-center gap-1 justify-center">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Import Successful!
                            </div>
                        )}
                        {importStatus === 'error' && (
                            <div className="mt-3 text-sm text-red-600 flex items-center gap-1 justify-center">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {errorMessage}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataSettings;
