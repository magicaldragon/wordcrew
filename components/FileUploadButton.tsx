
import React, { useRef, useCallback } from 'react';
import { CustomSoundFile } from '../types';

interface FileUploadButtonProps {
  id: string;
  label: string;
  accept: string;
  onFileUpload: (file: CustomSoundFile) => void;
  buttonText?: string;
  className?: string;
  disabled?: boolean;
}

// Formats the browser can reliably decode. Anything else (and anything the browser
// reports as unplayable) is refused up front instead of silently failing at play time.
export const ACCEPTED_AUDIO_FORMATS = ['.mp3', '.m4a', '.wav', '.ogg', '.oga', '.aac', '.webm'] as const;
export const ACCEPTED_AUDIO_ACCEPT_ATTR = ACCEPTED_AUDIO_FORMATS.join(',');
export const ACCEPTED_AUDIO_FORMATS_LABEL = 'MP3, M4A, WAV, OGG, AAC, WEBM';

// Uploads are kept in the browser as base64 data URLs inside localStorage, whose quota
// is only a few megabytes per origin and where base64 inflates the payload by ~33%.
// A larger file plays once and then disappears on reload, so it is rejected up front.
export const MAX_AUDIO_FILE_SIZE_MB = 1;
const MAX_AUDIO_FILE_SIZE_BYTES = MAX_AUDIO_FILE_SIZE_MB * 1024 * 1024;

const fileExtension = (fileName: string): string => {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex === -1 ? '' : fileName.slice(dotIndex).toLowerCase();
};

const canBrowserDecode = (file: File): boolean => {
  // Unknown MIME (common for .ogg/.aac on some systems): trust the extension instead.
  if (!file.type || !file.type.startsWith('audio/')) return true;
  return document.createElement('audio').canPlayType(file.type) !== '';
};

export const FileUploadButton: React.FC<FileUploadButtonProps> = ({
  id,
  label,
  accept,
  onFileUpload,
  buttonText = 'Upload File',
  className = '',
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      
      const resetInput = () => {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };

      if (file) {
        const isAcceptedFormat = (ACCEPTED_AUDIO_FORMATS as readonly string[]).includes(fileExtension(file.name));

        if (!isAcceptedFormat) {
          alert(`Unsupported file type. Please choose an audio file: ${ACCEPTED_AUDIO_FORMATS_LABEL}.`);
          resetInput();
          return;
        }

        if (!canBrowserDecode(file)) {
          alert(`This browser cannot play "${file.type}" audio. Please choose: ${ACCEPTED_AUDIO_FORMATS_LABEL}.`);
          resetInput();
          return;
        }

        if (file.size > MAX_AUDIO_FILE_SIZE_BYTES) {
          alert(`File size exceeds ${MAX_AUDIO_FILE_SIZE_MB}MB limit. Please pick a shorter clip or a lower bitrate file.`);
          resetInput();
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target && typeof e.target.result === 'string') {
            onFileUpload({ name: file.name, data: e.target.result });
          } else {
            console.error("FileReader did not return a string result for file:", file.name);
            alert("Error reading file. The file data could not be processed.");
          }
          resetInput(); // Reset after successful or failed load attempt (within onload)
        };
        reader.onerror = () => {
          console.error("FileReader error:", reader.error, "for file:", file.name);
          alert("Error reading file. Please try again or select a different file.");
          resetInput(); // Reset on error
        };
        reader.readAsDataURL(file);
      }
    },
    [onFileUpload]
  );

  const handleClick = () => {
    if (!disabled) {
        fileInputRef.current?.click();
    }
  };

  return (
    <div className={`flex flex-col items-start ${className}`}>
      <input
        type="file"
        id={id}
        ref={fileInputRef}
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        aria-label={label}
        disabled={disabled} // This disabled is for the input itself, button handles its own.
      />
      <button
        type="button"
        onClick={handleClick}
        className={`futuristic-button bg-cyber-purple/70 hover:bg-cyber-purple text-light-text py-2 px-4 rounded-md text-sm ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={disabled}
      >
        {buttonText}
      </button>
    </div>
  );
};
