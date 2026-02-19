import React from 'react';
import type { SOWData, SOWStatus } from '@/lib/sowService';
import { computeSOWRisks } from '@/lib/sowService';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, CheckCircle, Circle, ShieldCheck, ShieldAlert } from 'lucide-react';

interface SOWDocumentProps {
  data: SOWData;
  sowId: string;
  version: number;
  status: SOWStatus;
}

// ─── Helpers ───

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAC_RE = /^([0-9a-f]{2}[:-]){5}[0-9a-f]{2}$/i;
const NOISE = ['not provided', 'not configured', 'unknown', 'n/a'];

function sanitise(value: string | number | null | undefined): string | number | null {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  const s = String(value).trim();
  if (!s) return null;
  if (UUID_RE.test(s) || MAC_RE.test(s)) return null;
  if (NOISE.includes(s.toLowerCase())) return null;
  return s;
}

function formatBool(value: boolean | null | undefined): string | null {
  if (value === true) return 'Required';
  if (value === false) return 'Not Required';
  return null;
}

// ─── Shared Components ───

const Section: React.FC<{ title: string; number: string; children: React.ReactNode }> = ({ title, number, children }) => (
  <div className="mb-8" id={`sow-section-${number}`}>
    <h2 className="text-lg font-bold border-b pb-2 mb-4">
      <span className="text-muted-foreground mr-2">{number}.</span>
      {title}
    </h2>
    {children}
  </div>
);

const Field: React.FC<{ label: string; value: string | number | null | undefined; required?: boolean }> = ({ label, value, required }) => {
  const clean = sanitise(value);
  const missing = required && (clean == null || clean === '');
  if (clean == null && !required) return null;
  return (
    <div className={`grid grid-cols-3 gap-2 py-1.5 border-b border-dashed border-muted last:border-0 ${missing ? 'bg-red-50' : ''}`}>
      <span className={`text-sm font-medium ${missing ? 'text-red-600' : 'text-muted-foreground'}`}>
        {label}
        {missing && <span className="ml-2 text-[10px] font-bold text-red-600">MISSING — REQUIRES COMPLETION BEFORE SIGNATURE</span>}
      </span>
      <span className={`text-sm col-span-2 ${missing ? 'text-red-500 italic font-medium' : ''}`}>
        {missing ? 'Field incomplete' : clean}
      </span>
    </div>
  );
};

const BoolField: React.FC<{ label: string; value: boolean | null | undefined; required?: boolean }> = ({ label, value, required }) => {
  const display = formatBool(value);
  const missing = required && display == null;
  if (display == null && !required) return null;
  return (
    <div className={`grid grid-cols-3 gap-2 py-1.5 border-b border-dashed border-muted last:border-0 ${missing ? 'bg-red-50' : ''}`}>
      <span className={`text-sm font-medium ${missing ? 'text-red-600' : 'text-muted-foreground'}`}>
        {label}
        {missing && <span className="ml-2 text-[10px] font-bold text-red-600">MISSING</span>}
      </span>
      <span className={`text-sm col-span-2 ${missing ? 'text-red-500 italic' : ''}`}>{missing ? 'Field incomplete' : display}</span>
    </div>
  );
};

// ─── Risk Summary Panel ───

const RiskSummaryPanel: React.FC<{ data: SOWData }> = ({ data }) => {
  const risks = computeSOWRisks(data);
  const colorMap = { green: 'text-green-600', amber: 'text-amber-500', red: 'text-red-600' };
  const bgMap = { green: 'bg-green-50', amber: 'bg-amber-50', red: 'bg-red-50' };
  return (
    <Card className="border-muted">
      <CardContent className="pt-4">
        <h3 className="text-sm font-bold mb-3">SOW Risk Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {risks.map((r, i) => (
            <div key={i} className={`flex items-start gap-2 rounded-md px-3 py-2 text-xs ${bgMap[r.level]}`}>
              <Circle className={`h-3 w-3 mt-0.5 fill-current ${colorMap[r.level]}`} />
              <div>
                <p className={`font-semibold ${colorMap[r.level]}`}>{r.label}</p>
                <p className="text-muted-foreground">{r.details}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Executive Summary Engine ───

function buildExecutiveSummary(data: SOWData, overallMin: number, overallMax: number, allUseCases: string[]): string {
  const site = sanitise(data.siteAddress) || 'site to be confirmed';
  const process = sanitise(data.processDescription) || 'production processes';

  // Speed validation: ensure min <= max
  let minS = overallMin;
  let maxS = overallMax;
  if (minS > maxS && maxS > 0) [minS, maxS] = [maxS, minS];

  // Parse goals into clean sentence
  let goalsSentence = '';
  if (data.projectGoals) {
    const goals = data.projectGoals
      .split(/[\n;]/)
      .map(g => g.replace(/^\s*[\d]+[.)]\s*/, '').replace(/^[-•]\s*/, '').trim())
      .filter(Boolean)
      .map(g => g.charAt(0).toLowerCase() + g.slice(1).replace(/\.$/, ''));
    if (goals.length > 1) {
      goalsSentence = `The system will ${goals.slice(0, -1).join(', ')} and ${goals[goals.length - 1]} within the defined operational envelope.`;
    } else if (goals.length === 1) {
      goalsSentence = `The system will ${goals[0]} within the defined operational envelope.`;
    }
  }

  let summary = `This Statement of Work defines the deployment of a ${data.deploymentType} system at ${data.customerLegalName}, ${site} to monitor ${process}`;
  if (minS > 0 && maxS > 0) summary += ` operating between ${minS}–${maxS} ppm`;
  summary += '.';
  if (data.hardware.totalCameras > 0) summary += ` The deployment encompasses ${data.hardware.totalCameras} vision inspection point(s)`;
  if (allUseCases.length > 0) summary += ` covering ${allUseCases.join(', ')}`;
  if (data.hardware.totalCameras > 0 || allUseCases.length > 0) summary += '.';
  if (goalsSentence) summary += ` ${goalsSentence}`;

  return summary;
}

// ─── Responsibilities Matrix ───

const ResponsibilitiesMatrix: React.FC<{ deploymentType: string }> = ({ deploymentType }) => {
  const isVision = deploymentType === 'Vision' || deploymentType === 'Hybrid';
  const rows = [
    { task: 'Hardware Procurement', thingtrax: true, customer: false },
    { task: 'Network Infrastructure (VLAN, Switching, Cabling)', thingtrax: false, customer: true },
    { task: 'Power Supply to Server Location', thingtrax: false, customer: true },
    { task: 'Software Deployment & Configuration', thingtrax: true, customer: false },
    { task: 'Network Configuration (VLAN/Firewall Rules)', thingtrax: false, customer: true },
    { task: 'Production Line Access for Installation', thingtrax: false, customer: true },
    { task: 'Ongoing Platform Maintenance', thingtrax: true, customer: false },
    ...(isVision ? [
      { task: 'Camera Installation & Alignment', thingtrax: true, customer: false },
      { task: 'Vision Model Training & Validation', thingtrax: true, customer: false },
      { task: 'Sample Product Provision for Training', thingtrax: false, customer: true },
    ] : []),
    { task: 'IoT Device Installation', thingtrax: true, customer: false },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Responsibility</th>
            <th className="text-center py-2 px-4 font-semibold text-muted-foreground">ThingTrax</th>
            <th className="text-center py-2 px-4 font-semibold text-muted-foreground">Customer</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-dashed border-muted last:border-0">
              <td className="py-2 pr-4 text-sm">{r.task}</td>
              <td className="py-2 px-4 text-center">{r.thingtrax ? '✓' : ''}</td>
              <td className="py-2 px-4 text-center">{r.customer ? '✓' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Main Document ───

export const SOWDocument: React.FC<SOWDocumentProps> = ({ data, sowId, version, status }) => {
  const isVision = data.deploymentType === 'Vision' || data.deploymentType === 'Hybrid';

  // Collect all use cases across all lines
  const allUseCases = [...new Set(data.lines.flatMap(l => l.positions.flatMap(p => p.equipment.flatMap(e => e.cameras.flatMap(c => c.useCases)))).filter(Boolean))];

  // Compute overall speed range (validate min <= max per line)
  const allMinSpeeds = data.lines.map(l => l.minSpeed).filter(s => s > 0);
  const allMaxSpeeds = data.lines.map(l => l.maxSpeed).filter(s => s > 0);
  const overallMinSpeed = allMinSpeeds.length ? Math.min(...allMinSpeeds) : 0;
  const overallMaxSpeed = allMaxSpeeds.length ? Math.max(...allMaxSpeeds) : 0;

  // Detect validation issues
  const speedInverted = data.lines.some(l => l.minSpeed > 0 && l.maxSpeed > 0 && l.minSpeed > l.maxSpeed);

  // Filter empty hardware rows
  const servers = data.hardware.servers.filter(s => s.name || s.model);
  const gateways = data.hardware.gateways.filter(g => g.name || g.model);
  const receivers = data.hardware.receivers.filter(r => r.name || r.model);

  // Filter lines with content
  const lines = data.lines.filter(l => l.positions.length > 0 || l.lineName);

  // Section numbering
  let sn = 0;
  const sec = () => String(++sn);

  // Complexity tier color
  const tierColor = data.complexityTier === 'Red' ? 'bg-destructive text-destructive-foreground'
    : data.complexityTier === 'Amber' ? 'bg-amber-500 text-white'
    : data.complexityTier ? 'bg-green-600 text-white' : '';

  return (
    <div className="sow-document max-w-4xl mx-auto space-y-6 print:space-y-4" id="sow-content">
      {/* Header */}
      <div className="text-center border-b-2 pb-6">
        <h1 className="text-2xl font-bold mb-1">Statement of Work</h1>
        <p className="text-muted-foreground text-sm">{data.customerLegalName}</p>
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
          <span>SOW-{sowId?.slice(0, 8).toUpperCase()}</span>
          <span>Version {version}</span>
          <span>{new Date(data.generatedAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Status Banner */}
      {status === 'draft' && (
        <div className="flex items-center gap-3 rounded-lg px-4 py-3 bg-red-50 border border-red-300 text-red-800">
          <ShieldAlert className="h-5 w-5" />
          <div>
            <p className="font-semibold text-sm">🟡 Draft — Incomplete</p>
            <p className="text-xs">This document contains incomplete fields and is not valid for signature.</p>
          </div>
        </div>
      )}
      {status === 'ready' && (
        <div className="flex items-center gap-3 rounded-lg px-4 py-3 bg-green-50 border border-green-300 text-green-800">
          <ShieldCheck className="h-5 w-5" />
          <div>
            <p className="font-semibold text-sm">🟢 Ready for Signature</p>
            <p className="text-xs">All mandatory fields are complete. This document is ready for review and signature.</p>
          </div>
        </div>
      )}
      {status === 'signed' && (
        <div className="flex items-center gap-3 rounded-lg px-4 py-3 bg-blue-50 border border-blue-300 text-blue-800">
          <CheckCircle className="h-5 w-5" />
          <div>
            <p className="font-semibold text-sm">🔵 Signed</p>
            <p className="text-xs">This document has been digitally approved.</p>
          </div>
        </div>
      )}

      {/* Risk Summary Panel */}
      <RiskSummaryPanel data={data} />

      {/* Complexity Banner */}
      {data.complexityTier && (
        <div className={`flex items-center gap-3 rounded-lg px-4 py-3 ${tierColor}`}>
          <div>
            <p className="font-semibold text-sm">Deployment Complexity: {data.complexityTier}</p>
            {data.complexityTier === 'Red' && <p className="text-xs opacity-90">Executive Review Recommended</p>}
          </div>
        </div>
      )}

      {/* Speed Validation Warning */}
      {speedInverted && (
        <div className="flex items-center gap-2 rounded-lg px-4 py-2 bg-red-50 border border-red-300 text-red-700 text-xs">
          <AlertTriangle className="h-4 w-4" />
          Validation: One or more lines have Min Speed &gt; Max Speed. Values have been corrected for display.
        </div>
      )}

      {/* 1. Executive Summary */}
      <Section title="Executive Summary" number={sec()}>
        <p className="text-sm leading-relaxed">
          {buildExecutiveSummary(data, overallMinSpeed, overallMaxSpeed, allUseCases)}
        </p>
      </Section>

      {/* 2. Deployment Overview */}
      <Section title="Deployment Overview" number={sec()}>
        <Field label="Customer" value={data.customerLegalName} required />
        <Field label="Site Address" value={data.siteAddress} required />
        <Field label="Deployment Type" value={data.deploymentType} required />
        <Field label="Segment" value={data.segment} />
        <Field label="Process Description" value={data.processDescription} />
        <Field label="Product Description" value={data.productDescription} />
        {data.contacts.length > 0 && (
          <>
            <Separator className="my-4" />
            <h3 className="text-sm font-semibold mb-2">Project Team</h3>
            {data.contacts.map((c, i) => (
              <Field key={i} label={c.role} value={c.name} />
            ))}
          </>
        )}
      </Section>

      {/* 3. Inspection & Monitoring Scope */}
      <Section title="Inspection & Monitoring Scope" number={sec()}>
        {lines.length === 0 ? (
          <p className="text-sm text-red-500 italic">No lines configured — Field incomplete</p>
        ) : lines.map((line, li) => (
          <Card key={li} className="mt-4">
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold">{line.lineName}</h3>
                <Badge variant="outline" className="text-[10px]">{line.deploymentType}</Badge>
                {line.minSpeed > 0 && line.maxSpeed > 0 && line.minSpeed > line.maxSpeed && (
                  <Badge variant="destructive" className="text-[10px]">Speed inverted</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-8">
                <Field label="Min Speed" value={line.minSpeed > 0 ? `${line.minSpeed} ppm` : null} required={isVision} />
                <Field label="Max Speed" value={line.maxSpeed > 0 ? `${line.maxSpeed} ppm` : null} required={isVision} />
                <Field label="Products" value={line.numberOfProducts} />
                <Field label="Artworks" value={line.numberOfArtworks} />
              </div>
              <Field label="Line Description" value={line.lineDescription} />
              <Field label="Product Description" value={line.productDescription} />

              {line.positions.map((pos, pi) => (
                <div key={pi} className="ml-2 border-l-2 border-muted pl-4 mt-3">
                  <p className="text-xs font-semibold">
                    Position: {pos.name}
                    {pos.titles.length > 0 && <span className="ml-2 text-muted-foreground">({pos.titles.join(', ')})</span>}
                  </p>
                  {pos.equipment.map((eq, ei) => (
                    <div key={ei} className="ml-2 mt-2">
                      <p className="text-xs font-medium">Equipment: {eq.name} {eq.type && <span className="text-muted-foreground">({eq.type})</span>}</p>
                      {eq.cameras.map((cam, ci) => (
                        <div key={ci} className="ml-4 mt-2 bg-muted/50 rounded p-3 space-y-1">
                          <p className="text-xs font-semibold">📷 Vision Inspection Point</p>
                          <div className="grid grid-cols-2 gap-x-4">
                            <Field label="Camera Model" value={cam.cameraType} />
                            <Field label="Lens" value={cam.lensType} />
                            <Field label="Product Flow" value={cam.productFlow} />
                            <Field label="H-FOV" value={cam.horizontalFov} />
                            <Field label="Working Distance" value={cam.workingDistance} />
                          </div>
                          {cam.useCases.length > 0 && (
                            <div className="mt-1">
                              <span className="text-xs font-medium text-muted-foreground">Use Cases: </span>
                              <span className="text-xs">{cam.useCases.join(', ')}</span>
                            </div>
                          )}
                          <Field label="Use Case Description" value={cam.useCaseDescription} />
                          {cam.attributes.length > 0 && (
                            <div className="mt-1">
                              <span className="text-xs font-medium text-muted-foreground">Attributes: </span>
                              {cam.attributes.map((a, ai) => (
                                <span key={ai} className="text-xs">{a.title}{a.description ? ` (${a.description})` : ''}{ai < cam.attributes.length - 1 ? ', ' : ''}</span>
                              ))}
                            </div>
                          )}
                          <Field label="Camera View" value={cam.cameraViewDescription} />
                          <BoolField label="Lighting" value={cam.lightRequired} />
                          <Field label="Light Model" value={cam.lightModel} />
                          <BoolField label="PLC Attached" value={cam.plcAttached} />
                          <Field label="PLC Model" value={cam.plcModel} />
                          {cam.relayOutputs.length > 0 && (
                            <div className="mt-1">
                              <span className="text-xs font-medium text-muted-foreground">Relay Outputs: </span>
                              {cam.relayOutputs.map((ro, ri) => (
                                <span key={ri} className="text-xs">#{ro.outputNumber} {ro.type}{ro.customName ? ` "${ro.customName}"` : ''}{ri < cam.relayOutputs.length - 1 ? ', ' : ''}</span>
                              ))}
                            </div>
                          )}
                          <BoolField label="HMI" value={cam.hmiRequired} />
                          <Field label="HMI Model" value={cam.hmiModel} />
                          <Field label="Placement" value={cam.placementPositionDescription} />
                        </div>
                      ))}
                      {eq.iotDevices.map((iot, ii) => (
                        <div key={ii} className="ml-4 mt-2 bg-muted/50 rounded p-3 space-y-1">
                          <p className="text-xs font-semibold">📡 IoT Device: {iot.name}</p>
                          <Field label="Hardware Model" value={iot.hardwareModelName} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </Section>

      {/* 4. Hardware Architecture */}
      <Section title="Hardware Architecture" number={sec()}>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Card><CardContent className="pt-4"><p className="text-2xl font-bold">{data.hardware.totalCameras}</p><p className="text-xs text-muted-foreground">Total Cameras</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-2xl font-bold">{data.hardware.totalIotDevices}</p><p className="text-xs text-muted-foreground">Total IoT Devices</p></CardContent></Card>
        </div>
        {servers.length > 0 && (
          <><h3 className="text-sm font-semibold mb-2">Vision Servers</h3>
          {servers.map((s, i) => <Field key={i} label={s.name || `Server ${i + 1}`} value={`${s.model} (${s.assignedCameras} cameras)`} />)}</>
        )}
        {gateways.length > 0 && (
          <><h3 className="text-sm font-semibold mt-4 mb-2">Gateways</h3>
          {gateways.map((g, i) => <Field key={i} label={g.name || `Gateway ${i + 1}`} value={g.model} />)}</>
        )}
        {receivers.length > 0 && (
          <><h3 className="text-sm font-semibold mt-4 mb-2">Receivers</h3>
          {receivers.map((r, i) => <Field key={i} label={r.name || `Receiver ${i + 1}`} value={r.model} />)}</>
        )}
      </Section>

      {/* 5. Operational Performance Envelope (always show for Vision) */}
      {isVision && (() => {
        const perfSn = sec();
        const hasMissing = !data.skuCount || !data.complexityTier || data.detectionAccuracyTarget == null || data.falsePositiveRate == null || !data.lines.some(l => l.minSpeed > 0 && l.maxSpeed > 0);
        return (
          <Section title="Operational Performance Envelope" number={perfSn}>
            {hasMissing && (
              <div className="bg-red-50 border border-red-300 rounded-lg px-4 py-2 mb-4 text-red-700 text-xs font-medium">
                Performance commitments cannot be defined until highlighted fields are completed.
              </div>
            )}
            <Field label="Throughput Range" value={overallMinSpeed > 0 && overallMaxSpeed > 0 ? `${Math.min(overallMinSpeed, overallMaxSpeed)}–${Math.max(overallMinSpeed, overallMaxSpeed)} ppm` : null} required />
            <Field label="SKU Count Included" value={data.skuCount} required />
            <Field label="Complexity Tier" value={data.complexityTier} required />
            <Field label="Detection Accuracy Target" value={data.detectionAccuracyTarget != null ? `${data.detectionAccuracyTarget}%` : null} required />
            <Field label="False Positive Rate" value={data.falsePositiveRate != null ? `${data.falsePositiveRate}%` : null} required />
            <Field label="Product Presentation Assumptions" value={data.productPresentationAssumptions} />
            <Field label="Environmental Stability Assumptions" value={data.environmentalStabilityAssumptions} />
            <Card className="bg-muted/50 mt-4">
              <CardContent className="pt-4 text-xs italic">
                Performance commitments apply only within the defined operational envelope.
              </CardContent>
            </Card>
          </Section>
        );
      })()}

      {/* Infrastructure Requirements */}
      <Section title="Infrastructure Requirements" number={sec()}>
        <h3 className="text-sm font-semibold mb-2">Bandwidth & Cabling Specifications</h3>
        <Field label="Internet Speed" value={data.infraDetail?.internetSpeedMbps ? `${data.infraDetail.internetSpeedMbps} Mbps` : null} required />
        <Field label="Internal LAN Speed" value={data.infraDetail?.lanSpeedGbps ? `${data.infraDetail.lanSpeedGbps} Gbps per camera` : null} required />
        <Field label="Switch to Server Uplink" value={data.infraDetail?.switchUplinkGbps ? `${data.infraDetail.switchUplinkGbps} Gbps` : null} />
        <Field label="Cable Specification" value={data.infraDetail?.cableSpec} required />
        <Field label="Max Cable Distance" value={data.infraDetail?.maxCableDistanceM ? `${data.infraDetail.maxCableDistanceM}m` : null} />
        <BoolField label="PoE" value={data.infraDetail?.poeRequired} required />

        <Separator className="my-4" />
        <h3 className="text-sm font-semibold mb-2">IP Management & Remote Access</h3>
        <BoolField label="DHCP IP Reservation" value={data.infraDetail?.dhcpReservation} />
        <Field label="Remote Access Method" value={data.infraDetail?.remoteAccessMethod} required />
        <Field label="Server Mounting" value={data.infraDetail?.serverMounting} required />
        <Field label="Server Power Supply" value={data.infraDetail?.serverPowerSupply} required />

        <Separator className="my-4" />
        <h3 className="text-sm font-semibold mb-2">Port Requirements (Standard)</h3>
        <p className="text-xs text-muted-foreground mb-2">All ThingTrax deployments require the following network ports:</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1.5 pr-4 font-semibold text-muted-foreground">Direction</th>
                <th className="text-left py-1.5 pr-4 font-semibold text-muted-foreground">Port</th>
                <th className="text-left py-1.5 font-semibold text-muted-foreground">Destination / Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-dashed border-muted"><td className="py-1.5 pr-4">Inbound</td><td className="py-1.5 pr-4">22</td><td className="py-1.5">Internal VLAN only — ThingTrax device communication</td></tr>
              <tr className="border-b border-dashed border-muted"><td className="py-1.5 pr-4">Outbound</td><td className="py-1.5 pr-4">8883</td><td className="py-1.5">*.azure-devices.net (Azure IoT Hub)</td></tr>
              <tr className="border-b border-dashed border-muted"><td className="py-1.5 pr-4">Outbound</td><td className="py-1.5 pr-4">443</td><td className="py-1.5">Azure, Ubuntu APT, Azure DevOps, PyPI, Ngrok, AWS S3, MS Auth, VNC Services</td></tr>
              <tr className="border-b border-dashed border-muted"><td className="py-1.5 pr-4">Outbound</td><td className="py-1.5 pr-4">123</td><td className="py-1.5">NTP (time.windows.com, ntp.timeserver.com)</td></tr>
              <tr><td className="py-1.5 pr-4">Outbound</td><td className="py-1.5 pr-4">554</td><td className="py-1.5">Camera RTSP</td></tr>
            </tbody>
          </table>
        </div>

        {data.infraDetail?.notes && (
          <>
            <Separator className="my-4" />
            <h3 className="text-sm font-semibold mb-2">Additional Notes</h3>
            <p className="text-sm whitespace-pre-wrap">{data.infraDetail.notes}</p>
          </>
        )}

        <Card className="bg-muted/50 mt-4">
          <CardContent className="pt-4 text-xs italic">
            All cameras and servers should be on an isolated VLAN. Installation will not proceed until infrastructure readiness is validated.
          </CardContent>
        </Card>
      </Section>

      {/* Responsibilities Matrix */}
      <Section title="Responsibilities Matrix" number={sec()}>
        <ResponsibilitiesMatrix deploymentType={data.deploymentType} />
      </Section>

      {/* Model Training Scope (Vision only) */}
      {isVision && (
        <Section title="Model Training Scope" number={sec()}>
          <Field label="SKU Count Included" value={data.skuCount} />
          <Field label="Initial Training Cycle" value={data.initialTrainingCycle} />
          <Field label="Validation Period" value={data.validationPeriod} />
          <Field label="Retraining Exclusions" value={data.retrainingExclusions} />
        </Section>
      )}

      {/* Acceptance & Go-Live Criteria */}
      <Section title="Acceptance & Go-Live Criteria" number={sec()}>
        {/* Technical Completion */}
        <h3 className="text-sm font-semibold mb-2">Technical Completion</h3>
        <ul className="list-disc ml-5 text-sm space-y-1 mb-4">
          <li>Hardware online</li>
          <li>Network validated</li>
          <li>Data streaming confirmed</li>
        </ul>

        {/* Model Acceptance (Vision) */}
        {isVision && (
          <>
            <h3 className="text-sm font-semibold mb-2">Model Acceptance</h3>
            {(data.detectionAccuracyTarget == null || data.falsePositiveRate == null) && (
              <div className="bg-red-50 border border-red-300 rounded-lg px-4 py-2 mb-3 text-red-700 text-xs font-medium">
                Model acceptance criteria incomplete.
              </div>
            )}
            <Field label="Detection Accuracy" value={data.detectionAccuracyTarget != null ? `≥ ${data.detectionAccuracyTarget}%` : null} required />
            <Field label="False Positive Rate" value={data.falsePositiveRate != null ? `≤ ${data.falsePositiveRate}%` : null} required />
          </>
        )}

        {/* Go-Live */}
        <h3 className="text-sm font-semibold mt-4 mb-2">Go-Live</h3>
        {!data.goLiveDefinition && (
          <div className="bg-red-50 border border-red-300 rounded-lg px-4 py-2 mb-3 text-red-700 text-xs font-medium">
            Go-Live definition not defined.
          </div>
        )}
        <Field label="Go-Live Definition" value={data.goLiveDefinition} required />
        <Field label="Acceptance Criteria" value={data.acceptanceCriteria} required />
        <Field label="Stability Period" value={data.stabilityPeriod} />
        <Field label="Hypercare Window" value={data.hypercareWindow} />
      </Section>

      {/* Data Ownership & Retention */}
      <Section title="Data Ownership & Retention" number={sec()}>
        <ul className="list-disc ml-5 text-sm space-y-2">
          <li>Customer retains ownership of all production data.</li>
          <li>ThingTrax may retain anonymised diagnostic data for system improvement.</li>
          <li className={data.imageRetentionDays == null ? 'text-red-600 font-medium' : ''}>
            Image retention period: {data.imageRetentionDays != null ? `${data.imageRetentionDays} days` : (
              <span className="italic">Field incomplete</span>
            )}
            {data.imageRetentionDays == null && (
              <span className="ml-2 text-[10px] font-bold text-red-600">MISSING — REQUIRES COMPLETION BEFORE SIGNATURE</span>
            )}
          </li>
          <li>Remote access is restricted to support purposes only.</li>
        </ul>
      </Section>

      {/* Assumptions */}
      <Section title="Assumptions" number={sec()}>
        <ul className="list-disc ml-5 text-sm space-y-1.5">
          <li>Stable and consistent lighting conditions</li>
          <li>Stable camera mounting and positioning</li>
          <li>Consistent product presentation and orientation</li>
          <li>Accurate ERP inputs (if ERP integration applicable)</li>
          {data.productPresentationAssumptions && <li>{data.productPresentationAssumptions}</li>}
          {data.environmentalStabilityAssumptions && <li>{data.environmentalStabilityAssumptions}</li>}
        </ul>
      </Section>

      {/* Exclusions */}
      <Section title="Exclusions" number={sec()}>
        <ul className="list-disc ml-5 text-sm space-y-1.5">
          <li>New SKU onboarding beyond the defined count{data.skuCount ? ` (${data.skuCount})` : ''}</li>
          <li>Additional inspection types not specified in this SOW</li>
          <li>Mechanical redesign of mounting or conveyor systems</li>
          <li>Environmental changes affecting lighting or product presentation</li>
          <li>ERP system expansion or reconfiguration</li>
        </ul>
      </Section>

      {/* Delivery Milestones */}
      <Section title="Delivery Milestones (Indicative)" number={sec()}>
        <div className="space-y-2">
          {['Portal Provision', 'Hardware Dispatch', 'Installation', 'Model Training', 'Go-Live Target'].map((milestone, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-dashed border-muted last:border-0">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">{i + 1}</span>
              <span className="text-sm">{milestone}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3 italic">Exact dates to be confirmed during project kick-off.</p>
      </Section>

      {/* Governance & Version Control */}
      <Section title="Governance & Version Control" number={sec()}>
        <Field label="SOW ID" value={`SOW-${sowId?.slice(0, 8).toUpperCase()}`} />
        <Field label="Version" value={version} />
        <Field label="Signed Off By" value={data.feasibilitySignedOffBy} required />
        <Field label="Signed Off At" value={data.feasibilitySignedOffAt ? new Date(data.feasibilitySignedOffAt).toLocaleString() : null} />
        <Field label="Generated" value={new Date(data.generatedAt).toLocaleString()} />
      </Section>
    </div>
  );
};
