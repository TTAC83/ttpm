import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { FileText, Download, RefreshCw, Clock, AlertTriangle, Lock, Loader2, ShieldAlert } from 'lucide-react';
import { SOWDocument } from '@/components/sow/SOWDocument';
import {
  generateSOW,
  fetchCurrentSOW,
  fetchSOWHistory,
  fetchSolutionsLines,
  validateSOWReadiness,
  computeSOWStatus,
  type SOWData,
  type SOWValidationResult,
  type SOWStatus,
} from '@/lib/sowService';
import { supabase } from '@/integrations/supabase/client';
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

// Role whitelist for SOW generation
const SOW_ALLOWED_ROLES = ['solutions_consultant', 'senior_solutions_architect', 'vp_customer_success', 'internal_admin'];

export const SolutionsSOW: React.FC<SolutionsSOWProps> = ({ projectId, projectData }) => {
  const { toast } = useToast();
  const { profile, user } = useAuth();
  const [currentSOW, setCurrentSOW] = useState<any>(null);
  const [history, setHistory] = useState<SOWVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [validation, setValidation] = useState<SOWValidationResult | null>(null);
  const [sowStatus, setSowStatus] = useState<SOWStatus>('draft');

  const feasibilitySignedOff = projectData?.feasibility_signed_off ?? false;

  // Role-based access check
  const userRole = profile?.role as string | undefined;
  const hasRole = SOW_ALLOWED_ROLES.includes(userRole || '');
  const canGenerate = hasRole && feasibilitySignedOff;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sow, hist, lines, projRes] = await Promise.all([
        fetchCurrentSOW(projectId),
        fetchSOWHistory(projectId),
        fetchSolutionsLines(projectId),
        supabase.from('solutions_projects').select('*').eq('id', projectId).single(),
      ]);
      setCurrentSOW(sow);
      setHistory(hist);

      if (projRes.data) {
        setValidation(validateSOWReadiness(projRes.data, lines));
      }

      if (sow?.sow_data) {
        setSowStatus(computeSOWStatus(sow.sow_data as SOWData));
      }
    } catch (err) {
      console.error('Error loading SOW data:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadData(); }, [loadData, projectData?.feasibility_signed_off]);

  const handleGenerate = async () => {
    if (!user?.id) return;
    setGenerating(true);
    try {
      const result = await generateSOW(projectId, user.id);
      toast({ title: 'SOW Generated', description: `Version ${result.version} created successfully` });
      await loadData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to generate SOW', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleExportPDF = async () => {
    if (!currentSOW) return;
    setExporting(true);
    try {
      const sowData = currentSOW.sow_data as SOWData;
      const status = computeSOWStatus(sowData);
      const isDraftExport = status === 'draft';

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let y = 20;

      const checkPage = (needed: number = 10) => {
        if (y > pageHeight - needed) { doc.addPage(); y = 20; }
      };

      const addText = (text: string, x: number, options?: { fontSize?: number; fontStyle?: string; maxWidth?: number }): number => {
        const fontSize = options?.fontSize || 10;
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', options?.fontStyle || 'normal');
        const lines = doc.splitTextToSize(text, options?.maxWidth || contentWidth);
        for (const line of lines) {
          checkPage();
          doc.text(line, x, y);
          y += fontSize * 0.5;
        }
        return y;
      };

      const addField = (label: string, value: string | number | null | undefined, x: number = margin) => {
        if (!value && value !== 0) return;
        addText(`${label}: ${value}`, x, { fontSize: 9 });
        y += 1;
      };

      const addSection = (num: string, title: string) => {
        y += 6;
        checkPage(20);
        addText(`${num}. ${title}`, margin, { fontSize: 13, fontStyle: 'bold' });
        y += 2;
      };

      // Title
      addText('STATEMENT OF WORK', pageWidth / 2 - 30, { fontSize: 18, fontStyle: 'bold' });
      addText(sowData.customerLegalName, pageWidth / 2 - 20, { fontSize: 14 });
      addText(`SOW-${currentSOW.id.slice(0, 8).toUpperCase()} | Version ${currentSOW.version} | ${new Date(sowData.generatedAt).toLocaleDateString()}`, margin, { fontSize: 8 });
      y += 4;

      if (isDraftExport) {
        addText('STATUS: DRAFT — INCOMPLETE', margin, { fontSize: 10, fontStyle: 'bold' });
        y += 2;
      }

      const isVision = sowData.deploymentType === 'Vision' || sowData.deploymentType === 'Hybrid';
      const allMinRaw = sowData.lines.map(l => l.minSpeed).filter(s => s > 0);
      const allMaxRaw = sowData.lines.map(l => l.maxSpeed).filter(s => s > 0);
      const rawMin = allMinRaw.length ? Math.min(...allMinRaw) : 0;
      const rawMax = allMaxRaw.length ? Math.max(...allMaxRaw) : 0;
      const allMin = rawMin > 0 && rawMax > 0 ? Math.min(rawMin, rawMax) : rawMin;
      const allMax = rawMin > 0 && rawMax > 0 ? Math.max(rawMin, rawMax) : rawMax;
      const allUC = [...new Set(sowData.lines.flatMap(l => l.positions.flatMap(p => p.equipment.flatMap(e => e.cameras.flatMap(c => c.useCases)))))];
      const joinWithAnd = (items: string[]) => {
        if (items.length <= 1) return items.join('');
        return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
      };

      let sn = 0;
      const sec = () => String(++sn);

      // 1. Executive Summary
      addSection(sec(), 'EXECUTIVE SUMMARY');
      const site = sowData.siteAddress || 'site to be confirmed';
      const process = sowData.processDescription || 'production processes';
      let summary = `This Statement of Work defines the deployment of a ${sowData.deploymentType} system at ${sowData.customerLegalName}, ${site} to monitor ${process}`;
      if (allMin > 0 && allMax > 0) summary += ` operating within a throughput range of ${allMin}–${allMax} ppm`;
      summary += '.';
      if (sowData.hardware.totalCameras > 0) {
        summary += ` The deployment encompasses ${sowData.hardware.totalCameras} vision inspection point(s)`;
        if (allUC.length > 0) summary += ` covering ${joinWithAnd(allUC)}`;
        summary += '.';
      }
      if (sowData.projectGoals) {
        const goals = sowData.projectGoals.split(/[\n;]/).map(g => g.replace(/^\s*[\d]+[.)]\s*/, '').replace(/^[-•]\s*/, '').trim()).filter(Boolean);
        if (goals.length > 0) {
          const joined = goals.map(g => g.charAt(0).toLowerCase() + g.slice(1).replace(/\.$/, ''));
          summary += ` The system will ${joinWithAnd(joined)} within the defined operational performance envelope.`;
        }
      }
      addText(summary, margin, { fontSize: 9 });

      // 2. Deployment Overview
      addSection(sec(), 'DEPLOYMENT OVERVIEW');
      addField('Customer', sowData.customerLegalName);
      addField('Site Address', sowData.siteAddress);
      addField('Deployment Type', sowData.deploymentType);
      addField('Segment', sowData.segment);
      addField('Process Description', sowData.processDescription);
      addField('Product Description', sowData.productDescription);
      if (sowData.contacts.length > 0) {
        y += 2;
        addText('Project Team', margin, { fontSize: 10, fontStyle: 'bold' });
        for (const c of sowData.contacts) addField(c.role, c.name, margin + 4);
      }

      // 3. Deliverables
      addSection(sec(), 'DELIVERABLES');
      addText('ThingTrax will deliver:', margin, { fontSize: 9, fontStyle: 'bold' });
      const deliverables = [
        'Configured cloud portal instance',
        'Supplied hardware as defined in this SOW',
        'Initial configuration and system commissioning',
        'Superuser training sessions',
        ...(isVision ? ['Initial model training for defined SKU count'] : []),
        'Go-live support window (14 days unless otherwise specified)',
      ];
      for (const d of deliverables) { addText(`• ${d}`, margin + 4, { fontSize: 8 }); y += 1; }

      // 4. Inspection & Monitoring Scope (cleaned — no engineering noise)
      addSection(sec(), 'INSPECTION & MONITORING SCOPE');
      for (const line of sowData.lines.filter(l => l.positions.length > 0 || l.lineName)) {
        checkPage(30);
        const lineMin = line.minSpeed > 0 && line.maxSpeed > 0 ? Math.min(line.minSpeed, line.maxSpeed) : line.minSpeed;
        const lineMax = line.minSpeed > 0 && line.maxSpeed > 0 ? Math.max(line.minSpeed, line.maxSpeed) : line.maxSpeed;
        addText(`Line: ${line.lineName} (${line.deploymentType})`, margin, { fontSize: 10, fontStyle: 'bold' });
        if (lineMin > 0) addText(`Speed: ${lineMin}-${lineMax} ppm | Products: ${line.numberOfProducts ?? 'N/A'} | Artworks: ${line.numberOfArtworks ?? 'N/A'}`, margin + 4, { fontSize: 8 });
        for (const pos of line.positions) {
          addText(`Position: ${pos.name}${pos.titles.length ? ` (${pos.titles.join(', ')})` : ''}`, margin + 4, { fontSize: 9, fontStyle: 'bold' });
          for (const eq of pos.equipment) {
            addText(`Equipment: ${eq.name}`, margin + 8, { fontSize: 9 });
            for (const cam of eq.cameras) {
              y += 1;
              addText(`Camera: ${cam.cameraType} | Lens: ${cam.lensType}`, margin + 12, { fontSize: 8 });
              if (cam.useCases.length) addText(`Use Cases: ${joinWithAnd(cam.useCases)}`, margin + 12, { fontSize: 8 });
              addText(`Lighting: ${cam.lightRequired ? 'Required' : cam.lightRequired === false ? 'Not Required' : 'Field incomplete'} | PLC: ${cam.plcAttached ? 'Required' : cam.plcAttached === false ? 'Not Required' : 'Field incomplete'}`, margin + 12, { fontSize: 8 });
              y += 1;
            }
            for (const iot of eq.iotDevices) {
              addText(`IoT Device: ${iot.name} | Model: ${iot.hardwareModelName}`, margin + 12, { fontSize: 8 });
              y += 1;
            }
          }
        }
        y += 2;
      }

      // 5. Hardware Architecture
      addSection(sec(), 'HARDWARE ARCHITECTURE');
      addText(`Total Cameras: ${sowData.hardware.totalCameras} | Total IoT Devices: ${sowData.hardware.totalIotDevices}`, margin + 4, { fontSize: 9 });
      for (const s of sowData.hardware.servers.filter(s => s.name || s.model)) { addText(`Server: ${s.name} (${s.model}) - ${s.assignedCameras} cameras`, margin + 4, { fontSize: 8 }); y += 1; }
      for (const g of sowData.hardware.gateways.filter(g => g.name || g.model)) { addText(`Gateway: ${g.name} (${g.model})`, margin + 4, { fontSize: 8 }); y += 1; }

      // 6. Performance Envelope (Vision)
      if (isVision) {
        addSection(sec(), 'OPERATIONAL PERFORMANCE ENVELOPE');
        if (allMin > 0) addField('Throughput Range', `${allMin}-${allMax} ppm`);
        addField('SKU Count', sowData.skuCount);
        addField('Complexity Tier', sowData.complexityTier);
        addField('Detection Accuracy Target', sowData.detectionAccuracyTarget != null ? `${sowData.detectionAccuracyTarget}%` : null);
        addField('False Positive Rate', sowData.falsePositiveRate != null ? `${sowData.falsePositiveRate}%` : null);
        addText('Performance commitments apply only within the defined operational envelope. Operation outside the defined throughput range, SKU count, environmental stability, or product presentation conditions may require retraining or scope reassessment.', margin + 4, { fontSize: 8 });
      }

      // 7. Infrastructure
      addSection(sec(), 'INFRASTRUCTURE REQUIREMENTS');
      if (sowData.infraDetail?.internetSpeedMbps) addField('Internet Speed', `${sowData.infraDetail.internetSpeedMbps} Mbps`);
      if (sowData.infraDetail?.lanSpeedGbps) addField('Internal LAN Speed', `${sowData.infraDetail.lanSpeedGbps} Gbps per camera`);
      if (sowData.infraDetail?.switchUplinkGbps) addField('Switch to Server Uplink', `${sowData.infraDetail.switchUplinkGbps} Gbps`);
      addField('Cable Specification', sowData.infraDetail?.cableSpec);
      if (sowData.infraDetail?.maxCableDistanceM) addField('Max Cable Distance', `${sowData.infraDetail.maxCableDistanceM}m`);
      addField('PoE', sowData.infraDetail?.poeRequired ? 'Required' : sowData.infraDetail?.poeRequired === false ? 'Not Required' : 'Field incomplete');
      addField('DHCP IP Reservation', sowData.infraDetail?.dhcpReservation ? 'Required' : sowData.infraDetail?.dhcpReservation === false ? 'Not Required' : null);
      addField('Remote Access Method', sowData.infraDetail?.remoteAccessMethod);
      addField('Server Mounting', sowData.infraDetail?.serverMounting);
      addField('Server Power Supply', sowData.infraDetail?.serverPowerSupply);
      addText('Installation will not proceed until infrastructure readiness is validated.', margin + 4, { fontSize: 8 });

      // 8. Responsibilities Matrix
      addSection(sec(), 'RESPONSIBILITIES MATRIX');
      const respRows: [string, string][] = [
        ['Hardware Supply', 'ThingTrax'],
        ['Physical Fabrication and Mounting', 'Customer'],
        ['Network Infrastructure (VLAN, Switching, Cabling)', 'Customer'],
        ['Power Supply to Server Location', 'Customer'],
        ['Software Deployment and Configuration', 'ThingTrax'],
        ['Network Configuration (VLAN/Firewall Rules)', 'Customer'],
        ['Production Line Access for Installation', 'Customer'],
        ['Ongoing Platform Maintenance', 'ThingTrax'],
      ];
      if (isVision) {
        respRows.push(
          ['Camera Configuration and Alignment', 'ThingTrax'],
          ['Vision Model Training and Validation', 'ThingTrax'],
          ['Sample Product Provision for Training', 'Customer'],
        );
      }
      respRows.push(['IoT Device Installation', 'ThingTrax']);
      for (const [task, owner] of respRows) {
        addText(`${task}: ${owner}`, margin + 4, { fontSize: 8 });
        y += 1;
      }

      // 9. Model Training (Vision)
      if (isVision) {
        addSection(sec(), 'MODEL TRAINING SCOPE');
        addField('SKU Count', sowData.skuCount);
        addField('Initial Training Cycle', sowData.initialTrainingCycle);
        addField('Validation Period', sowData.validationPeriod);
        addField('Retraining Exclusions', sowData.retrainingExclusions);
      }

      // 10. Acceptance & Go-Live
      addSection(sec(), 'ACCEPTANCE & GO-LIVE CRITERIA');
      addText('Technical Completion:', margin, { fontSize: 9, fontStyle: 'bold' });
      addText('System considered technically complete when:', margin + 4, { fontSize: 8 });
      for (const tc of ['Hardware online', 'Network validated', 'Data streaming confirmed']) {
        addText(`• ${tc}`, margin + 4, { fontSize: 8 }); y += 1;
      }
      if (isVision) {
        addText('Model Acceptance:', margin, { fontSize: 9, fontStyle: 'bold' });
        addField('Detection Accuracy', sowData.detectionAccuracyTarget != null ? `≥ ${sowData.detectionAccuracyTarget}%` : 'Field incomplete');
        addField('False Positive Rate', sowData.falsePositiveRate != null ? `≤ ${sowData.falsePositiveRate}%` : 'Field incomplete');
        if (sowData.stabilityPeriod) addText(`Stable operation for ${sowData.stabilityPeriod} consecutive production hours.`, margin + 4, { fontSize: 8 });
      }
      addText('Operational Go-Live:', margin, { fontSize: 9, fontStyle: 'bold' });
      addText('Go-Live occurs upon:', margin + 4, { fontSize: 8 });
      for (const gl of ['Successful completion of stability window', 'Customer operational sign-off']) {
        addText(`• ${gl}`, margin + 4, { fontSize: 8 }); y += 1;
      }
      addField('Go-Live Definition', sowData.goLiveDefinition || 'Field incomplete');
      addField('Acceptance Criteria', sowData.acceptanceCriteria);
      addField('Stability Period', sowData.stabilityPeriod);
      addField('Hypercare Window', sowData.hypercareWindow);

      // 11. Data Ownership
      addSection(sec(), 'DATA OWNERSHIP & RETENTION');
      for (const clause of [
        'Customer retains ownership of all production data.',
        'ThingTrax may retain anonymised diagnostic data for system improvement.',
        `Image retention period: ${sowData.imageRetentionDays != null ? `${sowData.imageRetentionDays} days` : 'Field incomplete'}`,
        'Remote access is restricted to support purposes only.',
      ]) {
        addText(`• ${clause}`, margin + 4, { fontSize: 8 }); y += 1;
      }

      // 12. Post-Go-Live Support
      addSection(sec(), 'POST-GO-LIVE SUPPORT');
      addText('Post Go-Live support is provided under standard SaaS support terms. Additional retraining, new SKU onboarding, environmental changes, or scope expansion are subject to formal change control.', margin + 4, { fontSize: 8 });

      // 13. Assumptions
      addSection(sec(), 'ASSUMPTIONS');
      const assumptions = [
        'Stable and consistent lighting conditions',
        'Stable camera mounting and positioning',
        'Consistent product presentation and orientation',
        'Accurate ERP inputs (if ERP integration applicable)',
      ];
      if (sowData.productPresentationAssumptions) assumptions.push(sowData.productPresentationAssumptions);
      if (sowData.environmentalStabilityAssumptions) assumptions.push(sowData.environmentalStabilityAssumptions);
      for (const a of assumptions) { addText(`• ${a}`, margin + 4, { fontSize: 8 }); y += 1; }

      // 14. Exclusions
      addSection(sec(), 'EXCLUSIONS');
      const exclusions = [
        `New SKU onboarding beyond the defined count${sowData.skuCount ? ` (${sowData.skuCount})` : ''}`,
        'Additional inspection types not specified in this SOW',
        'Mechanical redesign of mounting or conveyor systems',
        'Environmental changes affecting lighting or product presentation',
        'ERP system expansion or reconfiguration',
      ];
      for (const e of exclusions) { addText(`• ${e}`, margin + 4, { fontSize: 8 }); y += 1; }

      // 15. Milestones
      addSection(sec(), 'DELIVERY MILESTONES (INDICATIVE)');
      for (const [i, m] of ['Portal Provision', 'Hardware Dispatch', 'Installation', 'Model Training', 'Go-Live Target'].entries()) {
        addText(`${i + 1}. ${m}`, margin + 4, { fontSize: 9 }); y += 1;
      }

      // 16. Governance
      addSection(sec(), 'GOVERNANCE & VERSION CONTROL');
      addField('SOW ID', `SOW-${currentSOW.id.slice(0, 8).toUpperCase()}`);
      addField('Version', currentSOW.version);
      addField('Signed Off By', sowData.feasibilitySignedOffBy);
      addField('Generated', new Date(sowData.generatedAt).toLocaleString());

      // Draft watermark on every page
      if (isDraftExport) {
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          doc.saveGraphicsState();
          doc.setGState(new (doc as any).GState({ opacity: 0.12 }));
          doc.setFontSize(54);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(200, 0, 0);
          const cx = pageWidth / 2;
          const cy = pageHeight / 2;
          doc.text('DRAFT — NOT VALID FOR SIGNATURE', cx, cy, { align: 'center', angle: 45 });
          doc.restoreGraphicsState();
        }
      }

      const prefix = isDraftExport ? 'DRAFT_' : '';
      const fileName = `${prefix}SOW-${sowData.customerLegalName.replace(/\s+/g, '_')}-v${currentSOW.version}.pdf`;
      doc.save(fileName);
      toast({ title: 'PDF Exported', description: fileName });
    } catch (err: any) {
      toast({ title: 'Export Error', description: err.message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!feasibilitySignedOff) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <Lock className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">Feasibility Gate Required</h3>
              <p className="text-sm text-muted-foreground mt-1">The Feasibility Gate must be signed off before a Statement of Work can be generated.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Validation Info */}
      {validation && !validation.ready && (
        <Card className="border-amber-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-600">
              <ShieldAlert className="h-4 w-4" />
              Draft mode — the following fields are incomplete and will be highlighted in red.
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc ml-5 text-sm space-y-1 text-muted-foreground">
              {validation.missing.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Statement of Work
                {currentSOW && (
                  <Badge
                    variant={sowStatus === 'ready' ? 'default' : 'secondary'}
                    className={`ml-2 text-xs ${sowStatus === 'draft' ? 'bg-amber-100 text-amber-800 border-amber-300' : sowStatus === 'ready' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-blue-100 text-blue-800 border-blue-300'}`}
                  >
                    {sowStatus === 'draft' ? '🟡 Draft' : sowStatus === 'ready' ? '🟢 Ready' : '🔵 Signed'}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {currentSOW ? `Version ${currentSOW.version} — Generated ${new Date(currentSOW.generated_at).toLocaleDateString()}` : 'No SOW has been generated yet'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {canGenerate && (
                <Button onClick={handleGenerate} disabled={generating}>
                  {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  {currentSOW ? (sowStatus === 'draft' ? 'Regenerate Draft' : 'Regenerate SOW') : (sowStatus === 'draft' ? 'Generate Draft SOW' : 'Generate SOW')}
                </Button>
              )}
              {currentSOW && (
                <Button variant="outline" onClick={handleExportPDF} disabled={exporting}>
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                  {sowStatus === 'draft' ? 'Export Draft PDF' : 'Export PDF'}
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
              status={sowStatus}
            />
          </CardContent>
        </Card>
      )}

      {/* Version History */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" />Version History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.map((v) => (
                <div key={v.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <Badge variant={v.is_current ? 'default' : 'secondary'} className="text-xs">v{v.version}</Badge>
                    <div>
                      <p className="text-sm font-medium">{v.change_summary}</p>
                      <p className="text-xs text-muted-foreground">By {v.generatedByName} — {new Date(v.generated_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">{v.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
