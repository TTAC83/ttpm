import React from 'react';
import type { SOWData } from '@/lib/sowService';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface SOWDocumentProps {
  data: SOWData;
  sowId: string;
  version: number;
  feasibilityGateId?: string;
}

const Section: React.FC<{ title: string; number: string; children: React.ReactNode }> = ({ title, number, children }) => (
  <div className="mb-8" id={`sow-section-${number}`}>
    <h2 className="text-lg font-bold border-b pb-2 mb-4">
      <span className="text-muted-foreground mr-2">{number}.</span>
      {title}
    </h2>
    {children}
  </div>
);

const Field: React.FC<{ label: string; value: string | number | null | undefined }> = ({ label, value }) => {
  if (!value && value !== 0) return null;
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-dashed border-muted last:border-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-sm col-span-2">{value}</span>
    </div>
  );
};

const BoolField: React.FC<{ label: string; value: boolean | null | undefined }> = ({ label, value }) => {
  if (value === null || value === undefined) return null;
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-dashed border-muted last:border-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-sm col-span-2">{value ? '✓ Yes' : '✗ No'}</span>
    </div>
  );
};

export const SOWDocument: React.FC<SOWDocumentProps> = ({ data, sowId, version, feasibilityGateId }) => {
  const isVision = data.deploymentType === 'Vision' || data.deploymentType === 'Hybrid';

  // Collect all use cases across all lines
  const allUseCases = [...new Set(data.lines.flatMap(l => l.positions.flatMap(p => p.equipment.flatMap(e => e.cameras.flatMap(c => c.useCases)))))];

  // Compute overall speed range
  const allMinSpeeds = data.lines.map(l => l.minSpeed).filter(s => s > 0);
  const allMaxSpeeds = data.lines.map(l => l.maxSpeed).filter(s => s > 0);
  const overallMinSpeed = allMinSpeeds.length ? Math.min(...allMinSpeeds) : 0;
  const overallMaxSpeed = allMaxSpeeds.length ? Math.max(...allMaxSpeeds) : 0;

  // Complexity tier color
  const tierColor = data.complexityTier === 'Red' ? 'bg-destructive text-destructive-foreground'
    : data.complexityTier === 'Amber' ? 'bg-amber-500 text-white'
    : 'bg-green-600 text-white';

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

      {/* Complexity Banner */}
      {data.complexityTier && (
        <div className={`flex items-center gap-3 rounded-lg px-4 py-3 ${tierColor}`}>
          <div>
            <p className="font-semibold text-sm">Deployment Complexity: {data.complexityTier}</p>
            {data.complexityTier === 'Red' && <p className="text-xs opacity-90">Executive Review Recommended</p>}
          </div>
        </div>
      )}

      {/* 1. Executive Summary */}
      <Section title="Executive Summary" number="1">
        <p className="text-sm leading-relaxed">
          This Statement of Work defines the scope for a <strong>{data.deploymentType}</strong> deployment
          at <strong>{data.customerLegalName}</strong>, {data.siteAddress || 'site address to be confirmed'}.
          The deployment covers <strong>{data.lines.length}</strong> production line(s)
          {overallMinSpeed > 0 && overallMaxSpeed > 0 && <> operating at <strong>{overallMinSpeed}–{overallMaxSpeed} ppm</strong></>}
          {data.hardware.totalCameras > 0 && <>, with <strong>{data.hardware.totalCameras}</strong> vision inspection point(s)</>}
          {allUseCases.length > 0 && <> across {allUseCases.join(', ')}</>}.
          {data.projectGoals && <> The intended outcome is: {data.projectGoals}</>}
        </p>
      </Section>

      {/* 2. Deployment Overview */}
      <Section title="Deployment Overview" number="2">
        <Field label="Customer" value={data.customerLegalName} />
        <Field label="Site Address" value={data.siteAddress} />
        <Field label="Deployment Type" value={data.deploymentType} />
        <Field label="Segment" value={data.segment} />
        <Field label="Process Description" value={data.processDescription} />
        <Field label="Product Description" value={data.productDescription} />
        <Field label="Project Goals" value={data.projectGoals} />
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
      <Section title="Inspection & Monitoring Scope" number="3">
        {data.lines.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No lines configured</p>
        ) : data.lines.map((line, li) => (
          <Card key={li} className="mt-4">
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold">{line.lineName}</h3>
                <Badge variant="outline" className="text-[10px]">{line.deploymentType}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-x-8">
                <Field label="Min Speed" value={line.minSpeed > 0 ? `${line.minSpeed} ppm` : null} />
                <Field label="Max Speed" value={line.maxSpeed > 0 ? `${line.maxSpeed} ppm` : null} />
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
                          <BoolField label="Lighting Required" value={cam.lightRequired} />
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
                          <BoolField label="HMI Required" value={cam.hmiRequired} />
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
      <Section title="Hardware Architecture" number="4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Card><CardContent className="pt-4"><p className="text-2xl font-bold">{data.hardware.totalCameras}</p><p className="text-xs text-muted-foreground">Total Cameras</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-2xl font-bold">{data.hardware.totalIotDevices}</p><p className="text-xs text-muted-foreground">Total IoT Devices</p></CardContent></Card>
        </div>
        {data.hardware.servers.length > 0 && (
          <><h3 className="text-sm font-semibold mb-2">Vision Servers</h3>
          {data.hardware.servers.map((s, i) => <Field key={i} label={s.name || `Server ${i + 1}`} value={`${s.model} (${s.assignedCameras} cameras)`} />)}</>
        )}
        {data.hardware.gateways.length > 0 && (
          <><h3 className="text-sm font-semibold mt-4 mb-2">Gateways</h3>
          {data.hardware.gateways.map((g, i) => <Field key={i} label={g.name || `Gateway ${i + 1}`} value={g.model} />)}</>
        )}
        {data.hardware.receivers.length > 0 && (
          <><h3 className="text-sm font-semibold mt-4 mb-2">Receivers</h3>
          {data.hardware.receivers.map((r, i) => <Field key={i} label={r.name || `Receiver ${i + 1}`} value={r.model} />)}</>
        )}
      </Section>

      {/* 5. Operational Performance Envelope */}
      {isVision && (
        <Section title="Operational Performance Envelope" number="5">
          {overallMinSpeed > 0 && overallMaxSpeed > 0 && <Field label="Throughput Range" value={`${overallMinSpeed}–${overallMaxSpeed} ppm`} />}
          <Field label="SKU Count Included" value={data.skuCount} />
          <Field label="Complexity Tier" value={data.complexityTier} />
          <Field label="Detection Accuracy Target" value={data.detectionAccuracyTarget != null ? `${data.detectionAccuracyTarget}%` : null} />
          <Field label="False Positive Rate" value={data.falsePositiveRate != null ? `${data.falsePositiveRate}%` : null} />
          <Field label="Product Presentation Assumptions" value={data.productPresentationAssumptions} />
          <Field label="Environmental Stability Assumptions" value={data.environmentalStabilityAssumptions} />
          <Card className="bg-muted/50 mt-4">
            <CardContent className="pt-4 text-xs italic">
              Performance commitments apply only within the defined operational envelope.
            </CardContent>
          </Card>
        </Section>
      )}

      {/* 6. Infrastructure Requirements */}
      <Section title="Infrastructure Requirements" number={isVision ? '6' : '5'}>
        {/* Bandwidth & Cabling */}
        <h3 className="text-sm font-semibold mb-2">Bandwidth & Cabling Specifications</h3>
            <Field label="Internet Speed" value={data.infraDetail.internetSpeedMbps ? `${data.infraDetail.internetSpeedMbps} Mbps` : null} />
            <Field label="Internal LAN Speed" value={data.infraDetail.lanSpeedGbps ? `${data.infraDetail.lanSpeedGbps} Gbps per camera` : null} />
            <Field label="Switch to Server Uplink" value={data.infraDetail.switchUplinkGbps ? `${data.infraDetail.switchUplinkGbps} Gbps` : null} />
            <Field label="Cable Specification" value={data.infraDetail.cableSpec} />
            <Field label="Max Cable Distance" value={data.infraDetail.maxCableDistanceM ? `${data.infraDetail.maxCableDistanceM}m` : null} />
        <BoolField label="PoE Required" value={data.infraDetail.poeRequired || null} />

        {/* IP & Remote Access */}
        <Separator className="my-4" />
        <h3 className="text-sm font-semibold mb-2">IP Management & Remote Access</h3>
            <BoolField label="DHCP IP Reservation" value={data.infraDetail.dhcpReservation || null} />
            <Field label="Remote Access Method" value={data.infraDetail.remoteAccessMethod} />
            <Field label="Server Mounting" value={data.infraDetail.serverMounting} />
        <Field label="Server Power Supply" value={data.infraDetail.serverPowerSupply} />

        {/* Port Requirements (static reference) */}
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

        {/* Additional Notes */}
        {data.infraDetail.notes && (
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

      {/* 7. Model Training Scope (Vision only) */}
      {isVision && (
        <Section title="Model Training Scope" number="7">
          <Field label="SKU Count Included" value={data.skuCount} />
          <Field label="Initial Training Cycle" value={data.initialTrainingCycle} />
          <Field label="Validation Period" value={data.validationPeriod} />
          <Field label="Retraining Exclusions" value={data.retrainingExclusions} />
        </Section>
      )}

      {/* 8. Acceptance & Go-Live Criteria */}
      <Section title="Acceptance & Go-Live Criteria" number={isVision ? '8' : '6'}>
        <Field label="Go-Live Definition" value={data.goLiveDefinition} />
        <Field label="Acceptance Criteria" value={data.acceptanceCriteria} />
        <Field label="Stability Period" value={data.stabilityPeriod} />
        <Field label="Hypercare Window" value={data.hypercareWindow} />
      </Section>

      {/* 9. Assumptions */}
      <Section title="Assumptions" number={isVision ? '9' : '7'}>
        <ul className="list-disc ml-5 text-sm space-y-1.5">
          <li>Stable and consistent lighting conditions</li>
          <li>Stable camera mounting and positioning</li>
          <li>Consistent product presentation and orientation</li>
          <li>Accurate ERP inputs (if ERP integration applicable)</li>
          {data.productPresentationAssumptions && <li>{data.productPresentationAssumptions}</li>}
          {data.environmentalStabilityAssumptions && <li>{data.environmentalStabilityAssumptions}</li>}
        </ul>
      </Section>

      {/* 10. Exclusions */}
      <Section title="Exclusions" number={isVision ? '10' : '8'}>
        <ul className="list-disc ml-5 text-sm space-y-1.5">
          <li>New SKU onboarding beyond the defined count{data.skuCount ? ` (${data.skuCount})` : ''}</li>
          <li>Additional inspection types not specified in this SOW</li>
          <li>Mechanical redesign of mounting or conveyor systems</li>
          <li>Environmental changes affecting lighting or product presentation</li>
          <li>ERP system expansion or reconfiguration</li>
        </ul>
      </Section>

      {/* 11. Delivery Milestones */}
      <Section title="Delivery Milestones (Indicative)" number={isVision ? '11' : '9'}>
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

      {/* 12. Governance & Version Control */}
      <Section title="Governance & Version Control" number={isVision ? '12' : '10'}>
        <Field label="SOW ID" value={`SOW-${sowId?.slice(0, 8).toUpperCase()}`} />
        {feasibilityGateId && <Field label="Gate ID" value={feasibilityGateId.slice(0, 8).toUpperCase()} />}
        <Field label="Version" value={version} />
        <Field label="Signed Off By" value={data.feasibilitySignedOffBy} />
        <Field label="Signed Off At" value={data.feasibilitySignedOffAt ? new Date(data.feasibilitySignedOffAt).toLocaleString() : null} />
        <Field label="Generated" value={new Date(data.generatedAt).toLocaleString()} />
      </Section>
    </div>
  );
};
