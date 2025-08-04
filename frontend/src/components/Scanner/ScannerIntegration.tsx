import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Scan, Usb, Wifi, File, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ScannerDevice {
  id: string;
  name: string;
  type: 'usb' | 'network' | 'local';
  connected: boolean;
}

interface ScannerIntegrationProps {
  onScanComplete: (file: File) => void;
  onError: (error: string) => void;
}

export const ScannerIntegration: React.FC<ScannerIntegrationProps> = ({
  onScanComplete,
  onError
}) => {
  const [devices, setDevices] = useState<ScannerDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<ScannerDevice | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [webUsbSupported, setWebUsbSupported] = useState(false);

  useEffect(() => {
    // Check if WebUSB is supported
    setWebUsbSupported('usb' in navigator);
    
    // Initialize with mock devices for demonstration
    const mockDevices: ScannerDevice[] = [
      {
        id: 'usb-scanner-1',
        name: 'HP LaserJet Pro MFP M428fdw',
        type: 'usb',
        connected: false
      },
      {
        id: 'network-scanner-1',
        name: 'Canon imageRUNNER ADVANCE C5535i',
        type: 'network',
        connected: false
      },
      {
        id: 'local-scanner-1',
        name: 'Local Scanner (File Upload)',
        type: 'local',
        connected: true
      }
    ];
    
    setDevices(mockDevices);
  }, []);

  const connectToUSBScanner = async () => {
    try {
      if (!webUsbSupported) {
        throw new Error('WebUSB is not supported in this browser');
      }

      // Request USB device access
      const device = await (navigator as any).usb.requestDevice({
        filters: [
          { vendorId: 0x03f0 }, // HP
          { vendorId: 0x04a9 }, // Canon
          { vendorId: 0x04b8 }, // Epson
          { vendorId: 0x0483 }, // Brother
        ]
      });

      toast.success(`Connected to ${device.productName || 'USB Scanner'}`);
      
      // Update device status
      setDevices(prev => prev.map(d => 
        d.type === 'usb' ? { ...d, connected: true, name: device.productName || d.name } : d
      ));

      return device;
    } catch (error) {
      console.error('USB connection error:', error);
      toast.error('Failed to connect to USB scanner');
      throw error;
    }
  };

  const connectToNetworkScanner = async () => {
    try {
      // For network scanners, we would typically use a different API
      // This is a mock implementation
      toast.info('Attempting to connect to network scanner...');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setDevices(prev => prev.map(d => 
        d.type === 'network' ? { ...d, connected: true } : d
      ));
      
      toast.success('Connected to network scanner');
    } catch (error) {
      console.error('Network scanner connection error:', error);
      toast.error('Failed to connect to network scanner');
      throw error;
    }
  };

  const handleDeviceSelect = async (device: ScannerDevice) => {
    try {
      setSelectedDevice(device);
      
      if (device.type === 'usb' && !device.connected) {
        await connectToUSBScanner();
      } else if (device.type === 'network' && !device.connected) {
        await connectToNetworkScanner();
      }
      
      toast.success(`Selected: ${device.name}`);
    } catch (error) {
      onError('Failed to select scanner device');
    }
  };

  const startScanning = async () => {
    if (!selectedDevice) {
      toast.error('Please select a scanner device first');
      return;
    }

    setIsScanning(true);
    setScanProgress(0);

    try {
      // Simulate scanning process
      const scanSteps = [
        { progress: 10, message: 'Initializing scanner...' },
        { progress: 30, message: 'Scanning document...' },
        { progress: 60, message: 'Processing image...' },
        { progress: 80, message: 'Converting to PDF...' },
        { progress: 100, message: 'Scan complete!' }
      ];

      for (const step of scanSteps) {
        setScanProgress(step.progress);
        toast.info(step.message);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Create a mock scanned PDF file
      const mockPdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Scanned Document) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
297
%%EOF`;

      const scannedFile = new File([mockPdfContent], `scanned_document_${Date.now()}.pdf`, {
        type: 'application/pdf'
      });

      onScanComplete(scannedFile);
      toast.success('Document scanned successfully!');
      
    } catch (error) {
      console.error('Scanning error:', error);
      onError('Failed to scan document');
    } finally {
      setIsScanning(false);
      setScanProgress(0);
    }
  };

  const handleManualFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,image/*';
    input.multiple = false;
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        onScanComplete(file);
        toast.success('File selected successfully!');
      }
    };
    
    input.click();
  };

  return (
    <div className="space-y-6">
      {/* Scanner Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            Scanner Integration
          </CardTitle>
          <CardDescription>
            Connect to your scanner or printer to scan documents directly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* WebUSB Support Status */}
          {!webUsbSupported && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                WebUSB is not supported in this browser. USB scanner connection may not work.
              </AlertDescription>
            </Alert>
          )}

          {/* Available Devices */}
          <div className="space-y-3">
            <h4 className="font-medium">Available Scanners</h4>
            <div className="grid gap-3">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedDevice?.id === device.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => handleDeviceSelect(device)}
                >
                  <div className="flex items-center gap-3">
                    {device.type === 'usb' && <Usb className="h-4 w-4" />}
                    {device.type === 'network' && <Wifi className="h-4 w-4" />}
                    {device.type === 'local' && <File className="h-4 w-4" />}
                    <div>
                      <p className="font-medium">{device.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {device.type} scanner
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={device.connected ? "default" : "secondary"}>
                      {device.connected ? "Connected" : "Disconnected"}
                    </Badge>
                    {selectedDevice?.id === device.id && (
                      <CheckCircle className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scan Controls */}
          {selectedDevice && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  onClick={startScanning}
                  disabled={isScanning || !selectedDevice.connected}
                  className="flex items-center gap-2"
                >
                  {isScanning ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Scan className="h-4 w-4" />
                      Start Scan
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleManualFileSelect}
                  disabled={isScanning}
                >
                  <File className="h-4 w-4 mr-2" />
                  Select File Manually
                </Button>
              </div>

              {/* Scan Progress */}
              {isScanning && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Scan Progress</span>
                    <span>{scanProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${scanProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 