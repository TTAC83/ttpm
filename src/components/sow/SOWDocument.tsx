import React from 'react';
import type { SOWData } from '@/lib/sowService';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

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

const Field: React.FC<{ label: string; value: string | number | null | undefined; stubbed?: boolean }> = ({ label, value, stubbed }) => (
  <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-dashed border-muted last:border-0">
    <span className="text-sm font-medium text-muted-foreground">{label}</span>
    <span className={`text-sm col-span-2 ${stubbed ? 'text-amber-500 italic' : ''}`}>
      {value || 'Not provided'}
    </span>
  </div>
);

const BoolField: React.FC<{ label: string; value: boolean | null | undefined; stubbed?: boolean }> = ({ label, value, stubbed }) => (
  <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-dashed border-muted last:border-0">
    <span className="text-sm font-medium text-muted-foreground">{label}</span>
    <span className={`text-sm col-span-2 ${stubbed ? 'text-amber-500 italic' : ''}`}>
      {value === null || value === undefined
        ? (stubbed ? 'Not configured' : 'Not confirmed')
        : value ? '✓ Yes' : '✗ No'}
    </span>
  </div>
);

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const SOWDocument: React.FC<SOWDocumentProps> = ({ data, sowId, version, feasibilityGateId }) => {
  // Complexity tier calculation (stubbed logic)
  const complexityTier = data.hardware.totalCameras > 20 || data.lines.length > 5
    ? 'High'
    : data.hardware.totalCameras > 10 || data.lines.length > 3
      ? 'Medium'
      : 'Low';

  const tierColor = complexityTier === 'High' ? 'bg-destructive text-destructive-foreground' :
    complexityTier === 'Medium' ? 'bg-amber-500 text-white' : 'bg-green-600 text-white';

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
        {feasibilityGateId && (
          <p className="text-xs text-muted-foreground mt-1">Gate ID: {feasibilityGateId}</p>
        )}
      </div>

      {/* Risk Banner */}
      <div className={`flex items-center gap-3 rounded-lg px-4 py-3 ${tierColor}`}>
        {complexityTier === 'High' ? <AlertTriangle className="h-5 w-5" /> :
          complexityTier === 'Medium' ? <Info className="h-5 w-5" /> :
            <CheckCircle className="h-5 w-5" />}
        <div>
          <p className="font-semibold text-sm">Deployment Complexity: {complexityTier}</p>
          {complexityTier === 'High' && (
            <p className="text-xs opacity-90">Executive Review Recommended</p>
          )}
        </div>
      </div>

      {/* 1. Deployment Overview */}
      <Section title="Deployment Overview" number="1">
        <Field label="Customer Legal Name" value={data.customerLegalName} />
        <Field label="Site Address" value={data.siteAddress} />
        <Field label="Deployment Type" value={data.deploymentType} />
        <Field label="Segment" value={data.segment} />
        <Field label="Process Description" value={data.processDescription} />
        <Field label="Product Description" value={data.productDescription} />
        <Field label="Project Goals" value={data.projectGoals} />
        <Separator className="my-4" />
        <h3 className="text-sm font-semibold mb-2">Project Team</h3>
        {data.contacts.map((c, i) => (
          <Field key={i} label={c.role} value={c.name} />
        ))}
      </Section>

      {/* 2. Logical Configuration Scope */}
      <Section title="Logical Configuration Scope" number="2">
        <Field label="Portal URL" value={data.portalUrl} />
        {data.factories.map((factory, fi) => (
          <Card key={fi} className="mt-4">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Factory: {factory.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {factory.shifts.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Shift Pattern</p>
                  <div className="grid grid-cols-4 gap-1 text-xs">
                    {factory.shifts.map((s, si) => (
                      <span key={si} className="bg-muted px-2 py-1 rounded">
                        {dayNames[s.day]} {s.shiftName}: {s.startTime}–{s.endTime}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {factory.groups.map((group, gi) => (
                <div key={gi}>
                  <p className="text-xs font-semibold">Group: {group.name}</p>
                  <div className="ml-4">
                    {group.lines.map((line, li) => (
                      <div key={li} className="flex items-center gap-2 text-xs py-0.5">
                        <span>{line.name}</span>
                        <Badge variant="outline" className="text-[10px] h-4">{line.solutionType}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </Section>

      {/* 3. Inspection & Monitoring Scope (per line) */}
      <Section title="Inspection & Monitoring Scope" number="3">
        {data.lines.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No lines configured</p>
        ) : data.lines.map((line, li) => (
          <Card key={li} className="mt-4">
            <CardHeader className="py-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm">{line.lineName}</CardTitle>
                <Badge variant="outline" className="text-[10px]">{line.deploymentType}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid grid-cols-2 gap-x-8">
                <Field label="Min Speed" value={`${line.minSpeed} ppm`} />
                <Field label="Max Speed" value={`${line.maxSpeed} ppm`} />
                <Field label="Products" value={line.numberOfProducts} />
                <Field label="Artworks" value={line.numberOfArtworks} />
              </div>
              <Field label="Line Description" value={line.lineDescription} />
              <Field label="Product Description" value={line.productDescription} />

              {line.positions.map((pos, pi) => (
                <div key={pi} className="ml-2 border-l-2 border-muted pl-4 mt-3">
                  <p className="text-xs font-semibold">
                    Position: {pos.name}
                    {pos.titles.length > 0 && (
                      <span className="ml-2 text-muted-foreground">({pos.titles.join(', ')})</span>
                    )}
                  </p>
                  {pos.equipment.map((eq, ei) => (
                    <div key={ei} className="ml-2 mt-2">
                      <p className="text-xs font-medium">Equipment: {eq.name} <span className="text-muted-foreground">({eq.type})</span></p>

                      {eq.cameras.map((cam, ci) => (
                        <div key={ci} className="ml-4 mt-2 bg-muted/50 rounded p-3 space-y-1">
                          <p className="text-xs font-semibold">📷 Camera: {cam.name}</p>
                          <div className="grid grid-cols-2 gap-x-4">
                            <Field label="Model" value={cam.cameraType} />
                            <Field label="Lens" value={cam.lensType} />
                            <Field label="IP Address" value={cam.cameraIp} />
                            <Field label="Product Flow" value={cam.productFlow} />
                            <Field label="H-FOV" value={cam.horizontalFov} />
                            <Field label="Working Distance" value={cam.workingDistance} />
                            <Field label="Smallest Text" value={cam.smallestText} />
                          </div>
                          {cam.useCases.length > 0 && (
                            <div className="mt-1">
                              <span className="text-xs font-medium text-muted-foreground">Use Cases: </span>
                              <span className="text-xs">{cam.useCases.join(', ')}</span>
                            </div>
                          )}
                          {cam.useCaseDescription && (
                            <Field label="Use Case Description" value={cam.useCaseDescription} />
                          )}
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
                          {cam.lightRequired && <Field label="Light Model" value={cam.lightModel} />}
                          <BoolField label="PLC Attached" value={cam.plcAttached} />
                          {cam.plcAttached && (
                            <>
                              <Field label="PLC Model" value={cam.plcModel} />
                              {cam.relayOutputs.length > 0 && (
                                <div className="mt-1">
                                  <span className="text-xs font-medium text-muted-foreground">Relay Outputs: </span>
                                  {cam.relayOutputs.map((ro, ri) => (
                                    <span key={ri} className="text-xs">
                                      #{ro.outputNumber} {ro.type}{ro.customName ? ` "${ro.customName}"` : ''}
                                      {ri < cam.relayOutputs.length - 1 ? ', ' : ''}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                          <BoolField label="HMI Required" value={cam.hmiRequired} />
                          {cam.hmiRequired && <Field label="HMI Model" value={cam.hmiModel} />}
                          <Separator className="my-2" />
                          <p className="text-xs font-medium text-muted-foreground">Camera Placement</p>
                          <BoolField label="Camera Can Fit" value={cam.placementCanFit} />
                          <BoolField label="Fabrication Confirmed" value={cam.placementFabricationConfirmed} />
                          <BoolField label="FOV Suitable" value={cam.placementFovSuitable} />
                          <Field label="Position Description" value={cam.placementPositionDescription} />
                        </div>
                      ))}

                      {eq.iotDevices.map((iot, ii) => (
                        <div key={ii} className="ml-4 mt-2 bg-muted/50 rounded p-3 space-y-1">
                          <p className="text-xs font-semibold">📡 IoT Device: {iot.name}</p>
                          <Field label="Hardware Model" value={iot.hardwareModelName} />
                          <Field label="Receiver MAC" value={iot.receiverMacAddress} />
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
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold">{data.hardware.totalCameras}</p>
              <p className="text-xs text-muted-foreground">Total Cameras</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold">{data.hardware.totalIotDevices}</p>
              <p className="text-xs text-muted-foreground">Total IoT Devices</p>
            </CardContent>
          </Card>
        </div>

        {data.hardware.servers.length > 0 && (
          <>
            <h3 className="text-sm font-semibold mb-2">Vision Servers</h3>
            {data.hardware.servers.map((s, i) => (
              <Field key={i} label={s.name || `Server ${i + 1}`} value={`${s.model} (${s.assignedCameras} cameras assigned)`} />
            ))}
          </>
        )}
        {data.hardware.gateways.length > 0 && (
          <>
            <h3 className="text-sm font-semibold mt-4 mb-2">Gateways</h3>
            {data.hardware.gateways.map((g, i) => (
              <Field key={i} label={g.name || `Gateway ${i + 1}`} value={g.model} />
            ))}
          </>
        )}
        {data.hardware.receivers.length > 0 && (
          <>
            <h3 className="text-sm font-semibold mt-4 mb-2">Receivers</h3>
            {data.hardware.receivers.map((r, i) => (
              <Field key={i} label={r.name || `Receiver ${i + 1}`} value={r.model} />
            ))}
          </>
        )}
      </Section>

      {/* 5. Infrastructure Responsibilities */}
      <Section title="Infrastructure Responsibilities" number="5">
        <BoolField label="Required Ports" value={null} stubbed />
        <BoolField label="VLAN Required" value={null} stubbed />
        <BoolField label="Static IP Required" value={null} stubbed />
        <BoolField label="10Gb Connection Required" value={null} stubbed />
        <BoolField label="Mount Fabrication Required" value={null} stubbed />
        <Field label="VPN" value={data.infrastructure.vpn} stubbed />
        <Field label="Storage Requirements" value={data.infrastructure.storageRequirements} stubbed />
        <Field label="Load Balancer" value={data.infrastructure.loadBalancer} stubbed />
      </Section>

      {/* 6. ERP Integration Scope */}
      <Section title="ERP Integration Scope" number="6">
        <Field label="ERP Integration" value={data.erpIntegration.applicable ? 'Yes' : 'Not applicable'} stubbed={!data.erpIntegration.applicable} />
        <Field label="ERP Type" value={data.erpIntegration.erpType} stubbed />
        <Field label="Data Direction" value={data.erpIntegration.dataDirection} stubbed />
        <Field label="Data Fields" value={data.erpIntegration.dataFields} stubbed />
      </Section>

      {/* 7. Model Training Scope (Vision only) */}
      {(data.deploymentType === 'Vision' || data.deploymentType === 'Hybrid') && (
        <Section title="Model Training Scope" number="7">
          <Field label="SKU Count" value={data.modelDataset.skuCount} stubbed />
          <Field label="Complexity Tier" value={data.modelDataset.complexityTier} stubbed />
          <Field label="Throughput" value={data.modelDataset.throughput} stubbed />
          <Field label="Detection Accuracy Target" value={data.modelDataset.detectionAccuracyTarget} stubbed />
          <Field label="False Positive Rate" value={data.modelDataset.falsePositiveRate} stubbed />
        </Section>
      )}

      {/* 8. Acceptance Criteria */}
      <Section title="Acceptance Criteria" number={data.deploymentType === 'IoT' ? '7' : '8'}>
        <Field label="Go-Live Definition" value={data.goLiveDefinition} stubbed />
      </Section>

      {/* 9. Change Control */}
      <Section title="Change Control" number={data.deploymentType === 'IoT' ? '8' : '9'}>
        <Card className="bg-muted/50">
          <CardContent className="pt-4 text-xs space-y-2">
            <p className="font-semibold">The following variables are subject to change control. Any modification to these parameters requires a formal scope reassessment:</p>
            <ul className="list-disc ml-4 space-y-1">
              <li>Number of SKUs / product variants ({data.modelDataset.skuCount})</li>
              <li>Line throughput requirements ({data.modelDataset.throughput})</li>
              <li>Inspection types and use cases ({data.lines.flatMap(l => l.positions.flatMap(p => p.equipment.flatMap(e => e.cameras.flatMap(c => c.useCases)))).filter((v, i, a) => a.indexOf(v) === i).join(', ') || 'Not specified'})</li>
              <li>Hardware configuration ({data.hardware.totalCameras} cameras, {data.hardware.totalIotDevices} IoT devices, {data.hardware.servers.length} servers)</li>
              <li>ERP integration scope ({data.erpIntegration.erpType})</li>
            </ul>
          </CardContent>
        </Card>
      </Section>

      {/* 10. Governance & Version Control */}
      <Section title="Governance & Version Control" number={data.deploymentType === 'IoT' ? '9' : '10'}>
        <Field label="SOW ID" value={`SOW-${sowId?.slice(0, 8).toUpperCase()}`} />
        <Field label="Version" value={version} />
        <Field label="Feasibility Signed Off" value={data.feasibilitySignedOff ? 'Yes' : 'No'} />
        <Field label="Signed Off By" value={data.feasibilitySignedOffBy || 'N/A'} />
        <Field label="Signed Off At" value={data.feasibilitySignedOffAt ? new Date(data.feasibilitySignedOffAt).toLocaleString() : 'N/A'} />
        <Field label="SOW Generated" value={new Date(data.generatedAt).toLocaleString()} />
      </Section>
    </div>
  );
};
