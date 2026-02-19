import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { FileText, Download, RefreshCw, Clock, AlertTriangle, Lock, Loader2 } from 'lucide-react';
import { SOWDocument } from '@/components/sow/SOWDocument';
import { generateSOW, fetchCurrentSOW, fetchSOWHistory, type SOWData } from '@/lib/sowService';
import jsPDF from 'jspdf';

interface SolutionsSOWProps {
  projectId: string;
  projectData: any;
}

interface SOWVersion {
  id: string;
  version: number;
  status: string;
  generated_by: string;
  generated_at: string;
  change_summary: string;
  is_current: boolean;
  generatedByName: string;
}

export const SolutionsSOW: React.FC<SolutionsSOWProps> = ({ projectId, projectData }) => {
  const { toast } = useToast();
  const { profile, user } = useAuth();
  const [currentSOW, setCurrentSOW] = useState<any>(null);
  const [history, setHistory] = useState<SOWVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);

  const feasibilitySignedOff = projectData?.feasibility_signed_off ?? false;

  // Check if user can generate SOW (based on team assignments)
  const canGenerate = profile?.is_internal === true && feasibilitySignedOff;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sow, hist] = await Promise.all([
        fetchCurrentSOW(projectId),
        fetchSOWHistory(projectId),
      ]);
      setCurrentSOW(sow);
      setHistory(hist);
    } catch (err) {
      console.error('Error loading SOW data:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerate = async () => {
    if (!user?.id) return;
    setGenerating(true);
    try {
      const result = await generateSOW(projectId, user.id);
      toast({
        title: 'SOW Generated',
        description: `Version ${result.version} created successfully`,
      });
      await loadData();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to generate SOW',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleExportPDF = async () => {
    if (!currentSOW) return;
    setExporting(true);
    try {
      const sowData = currentSOW.sow_data as SOWData;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let y = 20;

      const addText = (text: string, x: number, yPos: number, options?: { fontSize?: number; fontStyle?: string; maxWidth?: number }) => {
        const fontSize = options?.fontSize || 10;
        const fontStyle = options?.fontStyle || 'normal';
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', fontStyle);
        const lines = doc.splitTextToSize(text, options?.maxWidth || contentWidth);
        for (const line of lines) {
          if (yPos > doc.internal.pageSize.getHeight() - 20) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(line, x, yPos);
          yPos += fontSize * 0.5;
        }
        return yPos;
      };

      // Title
      y = addText('STATEMENT OF WORK', pageWidth / 2 - 30, y, { fontSize: 18, fontStyle: 'bold' });
      y = addText(sowData.customerLegalName, pageWidth / 2 - 20, y + 2, { fontSize: 14 });
      y = addText(`SOW-${currentSOW.id.slice(0, 8).toUpperCase()} | Version ${currentSOW.version} | ${new Date(sowData.generatedAt).toLocaleDateString()}`, margin, y + 4, { fontSize: 8 });

      y += 8;

      // Deployment Overview
      y = addText('1. DEPLOYMENT OVERVIEW', margin, y, { fontSize: 13, fontStyle: 'bold' });
      y += 2;
      const overviewFields = [
        ['Customer', sowData.customerLegalName],
        ['Site Address', sowData.siteAddress],
        ['Deployment Type', sowData.deploymentType],
        ['Segment', sowData.segment],
        ['Process Description', sowData.processDescription],
        ['Product Description', sowData.productDescription],
        ['Project Goals', sowData.projectGoals],
      ];
      for (const [label, value] of overviewFields) {
        y = addText(`${label}: ${value || 'Not provided'}`, margin, y, { fontSize: 9 });
        y += 1;
      }

      // Team
      y += 4;
      y = addText('Project Team', margin, y, { fontSize: 11, fontStyle: 'bold' });
      y += 1;
      for (const c of sowData.contacts) {
        y = addText(`${c.role}: ${c.name}`, margin + 4, y, { fontSize: 9 });
        y += 1;
      }

      // Lines
      y += 4;
      y = addText('2. INSPECTION & MONITORING SCOPE', margin, y, { fontSize: 13, fontStyle: 'bold' });
      y += 2;
      for (const line of sowData.lines) {
        if (y > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = 20; }
        y = addText(`Line: ${line.lineName} (${line.deploymentType})`, margin, y, { fontSize: 11, fontStyle: 'bold' });
        y = addText(`Speed: ${line.minSpeed}-${line.maxSpeed} ppm | Products: ${line.numberOfProducts || 'N/A'} | Artworks: ${line.numberOfArtworks || 'N/A'}`, margin + 4, y + 1, { fontSize: 8 });
        y += 2;

        for (const pos of line.positions) {
          y = addText(`Position: ${pos.name} ${pos.titles.length ? `(${pos.titles.join(', ')})` : ''}`, margin + 4, y, { fontSize: 9, fontStyle: 'bold' });
          for (const eq of pos.equipment) {
            y = addText(`Equipment: ${eq.name}`, margin + 8, y + 1, { fontSize: 9 });
            for (const cam of eq.cameras) {
              y += 1;
              y = addText(`Camera: ${cam.name} | Model: ${cam.cameraType} | Lens: ${cam.lensType}`, margin + 12, y, { fontSize: 8 });
              if (cam.useCases.length) y = addText(`Use Cases: ${cam.useCases.join(', ')}`, margin + 12, y + 1, { fontSize: 8 });
              if (cam.attributes.length) y = addText(`Attributes: ${cam.attributes.map(a => a.title).join(', ')}`, margin + 12, y + 1, { fontSize: 8 });
              y += 1;
            }
            for (const iot of eq.iotDevices) {
              y = addText(`IoT Device: ${iot.name} | Model: ${iot.hardwareModelName}`, margin + 12, y + 1, { fontSize: 8 });
              y += 1;
            }
          }
          y += 2;
        }
      }

      // Hardware
      if (y > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = 20; }
      y = addText('3. HARDWARE ARCHITECTURE', margin, y + 4, { fontSize: 13, fontStyle: 'bold' });
      y = addText(`Total Cameras: ${sowData.hardware.totalCameras} | Total IoT Devices: ${sowData.hardware.totalIotDevices}`, margin + 4, y + 2, { fontSize: 9 });
      y += 2;
      for (const s of sowData.hardware.servers) {
        y = addText(`Server: ${s.name} (${s.model}) - ${s.assignedCameras} cameras`, margin + 4, y, { fontSize: 8 });
        y += 1;
      }
      for (const g of sowData.hardware.gateways) {
        y = addText(`Gateway: ${g.name} (${g.model})`, margin + 4, y, { fontSize: 8 });
        y += 1;
      }

      // Governance
      if (y > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = 20; }
      y += 6;
      y = addText('GOVERNANCE', margin, y, { fontSize: 13, fontStyle: 'bold' });
      y = addText(`SOW ID: SOW-${currentSOW.id.slice(0, 8).toUpperCase()}`, margin + 4, y + 2, { fontSize: 9 });
      y = addText(`Version: ${currentSOW.version}`, margin + 4, y + 1, { fontSize: 9 });
      y = addText(`Feasibility Signed Off By: ${sowData.feasibilitySignedOffBy || 'N/A'}`, margin + 4, y + 1, { fontSize: 9 });
      y = addText(`Generated: ${new Date(sowData.generatedAt).toLocaleString()}`, margin + 4, y + 1, { fontSize: 9 });

      const fileName = `SOW-${sowData.customerLegalName.replace(/\s+/g, '_')}-v${currentSOW.version}.pdf`;
      doc.save(fileName);

      toast({ title: 'PDF Exported', description: fileName });
    } catch (err: any) {
      toast({ title: 'Export Error', description: err.message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!feasibilitySignedOff) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <Lock className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">Feasibility Gate Required</h3>
              <p className="text-sm text-muted-foreground mt-1">
                The Feasibility Gate must be signed off before a Statement of Work can be generated.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Statement of Work
              </CardTitle>
              <CardDescription>
                {currentSOW
                  ? `Version ${currentSOW.version} — Generated ${new Date(currentSOW.generated_at).toLocaleDateString()}`
                  : 'No SOW has been generated yet'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {canGenerate && (
                <Button onClick={handleGenerate} disabled={generating}>
                  {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  {currentSOW ? 'Regenerate SOW' : 'Generate SOW'}
                </Button>
              )}
              {currentSOW && currentSOW.status === 'current' && (
                <Button variant="outline" onClick={handleExportPDF} disabled={exporting}>
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                  Export PDF
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Outdated Warning */}
      {currentSOW && currentSOW.status === 'outdated' && (
        <Card className="border-amber-500">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <p className="font-semibold text-sm">SOW is Outdated</p>
                <p className="text-xs">Feasibility data has changed since this SOW was generated. Please regenerate.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SOW Document Preview */}
      {currentSOW && (
        <Card>
          <CardContent className="pt-6">
            <SOWDocument
              data={currentSOW.sow_data as SOWData}
              sowId={currentSOW.id}
              version={currentSOW.version}
              feasibilityGateId={projectId}
            />
          </CardContent>
        </Card>
      )}

      {/* Version History */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Version History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.map((v) => (
                <div key={v.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <Badge variant={v.is_current ? 'default' : 'secondary'} className="text-xs">
                      v{v.version}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{v.change_summary}</p>
                      <p className="text-xs text-muted-foreground">
                        By {v.generatedByName} — {new Date(v.generated_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {v.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
