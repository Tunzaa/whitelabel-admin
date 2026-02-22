import React, { useEffect, useState } from 'react';
import { DocumentType, VehicleType } from '@/features/configurations/types';
import { useConfigurationStore } from '@/features/configurations/store';
import { useModules } from '@/features/auth/hooks/use-modules';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DOCUMENT_TYPES } from '@/features/configurations/data/document-types';
import { VEHICLE_TYPES } from '@/features/configurations/data/vehicle-types';
import { Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
// Add this import for vehicle icons (emojis)

export interface TenantConfigurationHandle {
  saveConfigurations: () => Promise<void>;
}

interface TenantConfigurationProps {
  tenantId?: string;
  isEditable?: boolean;
  configurations: Record<string, any>;
  setConfigurations: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  vehicleTypes: any[];
  setVehicleTypes: React.Dispatch<React.SetStateAction<any[]>>;
  loading: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const TenantConfiguration = ({
  tenantId,
  isEditable = true,
  configurations,
  setConfigurations,
  vehicleTypes,
  setVehicleTypes,
  loading,
  activeTab,
  setActiveTab,
}: TenantConfigurationProps) => {
    // Check if affiliates module is enabled
    const { isModuleEnabled } = useModules();
    const configurationsRef = React.useRef(configurations);
    const vehicleTypesRef = React.useRef(vehicleTypes);
    useEffect(() => { configurationsRef.current = configurations; }, [configurations]);
    useEffect(() => { vehicleTypesRef.current = vehicleTypes; }, [vehicleTypes]);
    const {
      loading: storeLoading,
      error,
      fetchVehicleTypes,
      fetchEntities,
      saveEntityConfiguration,
      createVehicleType,
      updateVehicleType,
      deleteVehicleType,
      fetchDocumentTypes,
      createDocumentType,
    } = useConfigurationStore();

    // Only keep error toast effect
    useEffect(() => {
      if (error) {
        toast.error(error);
      }
    }, [error]);

    // Handlers now update local state
    const addDocumentType = (entityType: string, slug: string) => {
      const docToAdd = DOCUMENT_TYPES.find(d => d.slug === slug);
      if (!docToAdd) return;
      setConfigurations((prev: Record<string, any>) => {
        const config = prev[entityType] || { document_types: [] };
        if ((config.document_types as any[]).some((d: any) => d.name === docToAdd.name)) {
          toast.info(`'${docToAdd.name}' is already in the list.`);
          return prev;
        }
        const newDoc: any = {
          document_type_id: `new_${slug}_${Date.now()}`,
          name: docToAdd.name,
          description: docToAdd.description || '',
          is_required: false,
          is_active: true,
          tenant_id: '',
          metadata: { slug: docToAdd.slug },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const updatedConfig = { ...config, document_types: [...(config.document_types || []), newDoc] };
        return { ...prev, [entityType]: updatedConfig };
      });
    };

    const removeDocumentType = (entityType: string, index: number) => {
      setConfigurations((prev: Record<string, any>) => {
        const config = prev[entityType];
        if (!config || !config.document_types) return prev;
        const updatedDocs = [...config.document_types];
        updatedDocs.splice(index, 1);
        const updatedConfig = { ...config, document_types: updatedDocs };
        return { ...prev, [entityType]: updatedConfig };
      });
    };

    const updateDocumentType = (entityType: string, index: number, field: string, value: any) => {
      setConfigurations((prev: Record<string, any>) => {
        const config = prev[entityType];
        if (!config || !config.document_types) return prev;
        const updatedDocs = [...config.document_types];
        const docToUpdate = { ...updatedDocs[index], [field]: value };
        updatedDocs[index] = docToUpdate;
        const updatedConfig = { ...config, document_types: updatedDocs };
        return { ...prev, [entityType]: updatedConfig };
      });
    };

    const handleAddVehicleType = (slug: string) => {
      const vehicleToAdd = VEHICLE_TYPES.find(v => v.slug === slug);
      if (!vehicleToAdd) return;
      if ((vehicleTypes as any[]).some((v: any) => v.name === vehicleToAdd.name)) {
        toast.info(`'${vehicleToAdd.name}' is already in the list.`);
        return;
      }
      const newVehicle: any = {
        id: `new_${slug}_${Date.now()}`,
        name: vehicleToAdd.name, // Use canonical name
        description: vehicleToAdd.description || '',
        is_active: true,
        tenant_id: '',
        metadata: { icon: vehicleToAdd.icon, slug: vehicleToAdd.slug },
      };
      setVehicleTypes([...(vehicleTypes as any[]), newVehicle]);
    };

    const handleUpdateVehicleType = (id: string, data: Partial<any>) => {
      setVehicleTypes((vehicleTypes as any[]).map((vt: any) => {
        if (vt.id !== id) return vt;
        let updated = { ...vt, ...data };
        // If updating name/slug, always use canonical name and add slug to metadata
        if (data.name || data.slug) {
          const vtype = VEHICLE_TYPES.find(v => v.name === data.name || v.slug === data.slug);
          if (vtype) {
            updated.name = vtype.name;
            updated.metadata = { ...(updated.metadata || {}), icon: vtype.icon, slug: vtype.slug };
          }
        }
        return updated;
      }));
    };

    const handleDeleteVehicleType = (id: string) => {
      setVehicleTypes((vehicleTypes as any[]).filter((vt: any) => vt.id !== id));
    };

    // Helper to get vehicle icon
    const getVehicleIcon = (slug: string) => {
      const vt = VEHICLE_TYPES.find(v => v.slug === slug);
      return vt?.icon || '';
    };

    // Helper to get document description
    const getDocDescription = (slug: string) => {
      const dt = DOCUMENT_TYPES.find(d => d.slug === slug);
      return dt?.description || '';
    };

    // Add new document type row
    const handleAddDocumentTypeRow = (entity: string) => {
      setConfigurations((prev: Record<string, any>) => {
        const config = prev[entity] || { document_types: [] };
        const newDoc: any = {
          document_type_id: `new_${Date.now()}`,
          name: '',
          description: '',
          is_required: false,
          is_active: true,
          tenant_id: '',
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const updatedConfig = { ...config, document_types: [...(config.document_types || []), newDoc] };
        return { ...prev, [entity]: updatedConfig };
      });
    };

    // Add new vehicle type row
    const handleAddVehicleTypeRow = () => {
      const newVehicle: any = {
        id: `new_${Date.now()}`,
        name: '',
        description: '',
        is_active: true,
        tenant_id: '',
        metadata: {},
      };
      setVehicleTypes([...(vehicleTypes as any[]), newVehicle]);
    };

    // --- UI ---
    return (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
          <TabsTrigger value="vendor">Vendor</TabsTrigger>
          {isModuleEnabled('affiliates') && (
            <TabsTrigger value="winga">Winga</TabsTrigger>
          )}
          <TabsTrigger value="vehicles">Vehicle Types</TabsTrigger>
        </TabsList>

        {/* Document Types Tabs */}
        {["delivery", "vendor", ...(isModuleEnabled('affiliates') ? ["winga"] : [])].map(entity => (
          <TabsContent key={entity} value={entity} className="space-y-6">
            <div className="flex items-center justify-between border-b pb-2 mb-2">
              <div className="font-semibold text-lg">
                Document Types for {entity.charAt(0).toUpperCase() + entity.slice(1)}
              </div>
              {isEditable && (
                <Button onClick={() => handleAddDocumentTypeRow(entity)} variant="default" size="sm">
                  <Plus className="mr-1 h-4 w-4" /> Add Document Type
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {(configurations[entity]?.document_types || []).length > 0 ? (
                (configurations[entity]?.document_types || []).map((doc: any, index: number) => (
                  <React.Fragment key={doc.document_type_id || index}>
                    <div className="flex flex-wrap items-center gap-3 rounded-md px-3 py-2">
                      <div className="flex flex-1 justify-between">
                        {/* Select for document type */}
                        <Select
                          value={DOCUMENT_TYPES.find(dt => dt.name === doc.name)?.slug || ''}
                          onValueChange={slug => {
                            const dt = DOCUMENT_TYPES.find(d => d.slug === slug);
                            if (dt) {
                              updateDocumentType(entity, index, 'name', dt.name);
                              updateDocumentType(entity, index, 'description', dt.description || '');
                            }
                          }}
                        disabled={!isEditable}
                        >
                          <SelectTrigger className="w-[220px]">
                            <SelectValue placeholder="Select document type..." />
                          </SelectTrigger>
                          <SelectContent>
                            {DOCUMENT_TYPES.map(option => (
                              <SelectItem key={option.slug} value={option.slug}>
                                {option.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                          {/* Is Required */}
                          <Checkbox
                            id={`is_required_${entity}_${index}`}
                            checked={doc.is_required}
                            onCheckedChange={checked => updateDocumentType(entity, index, 'is_required', !!checked)}
                            disabled={!isEditable}
                          />
                          <Label htmlFor={`is_required_${entity}_${index}`}>Is Required</Label>
                          {/* Remove button */}
                          {isEditable && (
                            <Button variant="ghost" size="icon" onClick={() => removeDocumentType(entity, index)} disabled={loading}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {/* Description field (auto-filled) */}
                      <Input
                        placeholder="Description"
                        value={doc.description || ''}
                        onChange={e => updateDocumentType(entity, index, 'description', e.target.value)}
                        readOnly={!isEditable}
                        className="flex-grow min-w-[180px] mt-2"
                      />
                    </div>
                    <Separator />
                  </React.Fragment>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 border rounded-md bg-gray-50">
                  <p className="text-muted-foreground mb-2">
                    No document types configured for this entity.
                  </p>
                  {isEditable && (
                    <Button onClick={() => handleAddDocumentTypeRow(entity)} variant="outline" className="mt-2">
                      <Plus className="mr-1" /> Add Document Type
                    </Button>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        ))}

        {/* Vehicle Types Tab */}
        <TabsContent value="vehicles" className="space-y-6">
          <div className="flex items-center justify-between border-b pb-2 mb-2">
            <div className="font-semibold text-lg">Vehicle Types</div>
            {isEditable && (
              <Button onClick={handleAddVehicleTypeRow} variant="default" size="sm">
                <Plus className="mr-1 h-4 w-4" /> Add Vehicle Type
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {vehicleTypes.length > 0 ? (
              vehicleTypes.map((vt, index) => (
                <>
                  <div
                    key={vt.id}
                    className="flex flex-wrap items-center gap-3 rounded-md px-3 py-2"
                  >
                    <div className='flex flex-1 justify-between'>
                      {/* Select for vehicle type with icon */}
                      <Select
                        value={VEHICLE_TYPES.find(v => v.name === vt.name)?.slug || vt.metadata?.slug || ''}
                        onValueChange={slug => {
                          const vtype = VEHICLE_TYPES.find(v => v.slug === slug);
                          if (vtype) {
                            handleUpdateVehicleType(vt.id, { name: vtype.name, description: vtype.description || '', metadata: { icon: vtype.icon, slug: vtype.slug } });
                          }
                        }}
                        disabled={!isEditable}
                      >
                        <SelectTrigger className="w-[220px]">
                          <SelectValue placeholder="Select vehicle type...">
                            {vt.name ? (
                              <span className="flex items-center">
                                <span className="mr-2">{getVehicleIcon(VEHICLE_TYPES.find(v => v.name === vt.name)?.slug || '')}</span>
                                {vt.name}
                              </span>
                            ) : null}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {VEHICLE_TYPES.map(option => (
                            <SelectItem key={option.slug} value={option.slug}>
                              <span className="mr-2">{option.icon}</span>{option.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className='flex items-center gap-2'>
                        {/* Is Active */}
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`is_active_${vt.id}`}
                            checked={vt.is_active}
                            onCheckedChange={checked => handleUpdateVehicleType(vt.id, { is_active: !!checked })}
                            disabled={!isEditable}
                          />
                          <Label htmlFor={`is_active_${vt.id}`}>Is Active</Label>
                        </div>
                        {/* Remove button */}
                        {isEditable && (
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteVehicleType(vt.id)} disabled={loading}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {/* Description field (auto-filled) */}
                    <Input
                      placeholder="Description"
                      value={vt.description || ''}
                      onChange={e => handleUpdateVehicleType(vt.id, { description: e.target.value })}
                      readOnly={!isEditable}
                      className="flex-grow min-w-[180px]"
                    />
                  </div>
                  <Separator />
                </>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 border rounded-md bg-gray-50">
                <p className="text-muted-foreground mb-2">
                  No vehicle types configured for this tenant.
                </p>
                {isEditable && (
                  <Button onClick={handleAddVehicleTypeRow} variant="outline" className="mt-2">
                    <Plus className="mr-1" /> Add Vehicle Type
                  </Button>
                )}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    );
  }

// Utility function to map local doc types to backend doc type IDs
async function mapLocalDocsToBackendIds({
  tenantId,
  localDocs,
  allBackendDocTypes,
  createDocumentTypeFn,
}: {
  tenantId: string;
  localDocs: any[];
  allBackendDocTypes: any[];
  createDocumentTypeFn: (tenantId: string, data: any) => Promise<any>;
}): Promise<{ document_type_id: string; is_required: boolean }[]> {
  const result: { document_type_id: string; is_required: boolean }[] = [];
  for (const doc of localDocs) {
    const canonicalName = doc.name.trim().toLowerCase();
    let backendDoc = allBackendDocTypes.find(
      (d: any) => d.name.trim().toLowerCase() === canonicalName
    );
    if (!backendDoc) {
      // Try to find canonical config for description/slug
      const docTypeOption = DOCUMENT_TYPES.find(
        d => d.name.trim().toLowerCase() === canonicalName
      );
      const newDoc = await createDocumentTypeFn(tenantId, {
        name: docTypeOption ? docTypeOption.name : doc.name,
        description: docTypeOption ? docTypeOption.description || '' : doc.description,
        metadata: docTypeOption ? { slug: docTypeOption.slug } : doc.metadata,
      });
      if (!newDoc || !newDoc.document_id) {
        continue;
      }
      backendDoc = newDoc;
      allBackendDocTypes.push(newDoc);
    }
    if (!backendDoc.document_id) {
      continue;
    }
    result.push({
      document_type_id: backendDoc.document_id, // Use backend document_id for payload
      is_required: doc.is_required,
    });
  }
  return result;
}// Save function to be called from parent
export async function saveConfigurations(tenantId: string, configurations: Record<string, any>, vehicleTypes: any[], isModuleEnabled: (module: string) => boolean) {
  const {
    saveEntityConfiguration,
    createVehicleType,
    updateVehicleType,
    deleteVehicleType,
    fetchVehicleTypes,
    fetchDocumentTypes,
    fetchEntities,
    createDocumentType,
  } = useConfigurationStore.getState();

  toast.info('Saving configurations...');
  try {
    // --- VEHICLE TYPES ---
    // Log the local state as received
    await fetchVehicleTypes(tenantId);
    // Use canonical name and metadata from VEHICLE_TYPES for payload
    const backendVehicleTypes = (useConfigurationStore.getState().vehicleTypes || []).map(vt => ({
      ...vt,
      name: vt.name, // keep as is
    }));
    const localVehicleTypes = (vehicleTypes || []).map(vt => {
      const vtype = VEHICLE_TYPES.find(v => v.name === vt.name || v.slug === vt.metadata?.slug);
      return {
        ...vt,
        name: vtype ? vtype.name : vt.name, // use canonical name if possible
        metadata: vtype ? { icon: vtype.icon, slug: vtype.slug } : vt.metadata,
      };
    });
    let vehicleCreates = 0, vehicleUpdates = 0, vehicleDeletes = 0;
    for (const vt of localVehicleTypes) {
      if (vt.id && String(vt.id).startsWith('new_')) {
        await createVehicleType(tenantId, {
          name: vt.name, // canonical name
          description: vt.description || '',
          is_active: vt.is_active !== false,
          metadata: vt.metadata, // include icon and slug
        });
        vehicleCreates++;
      }
    }
    for (const vt of localVehicleTypes) {
      const backend = backendVehicleTypes.find(bvt => bvt.name === vt.name && !String(vt.id).startsWith('new_'));
      if (backend && (
        backend.description !== vt.description ||
        backend.is_active !== vt.is_active ||
        JSON.stringify(backend.metadata) !== JSON.stringify(vt.metadata)
      )) {
        await updateVehicleType(backend.id, {
          name: vt.name, // canonical name
          description: vt.description,
          is_active: vt.is_active,
          tenant_id: tenantId,
          metadata: vt.metadata, // include icon and slug
        });
        vehicleUpdates++;
      }
    }
    for (const bvt of backendVehicleTypes) {
      if (!localVehicleTypes.some(vt => vt.name === bvt.name)) {
        await deleteVehicleType(bvt.id, tenantId);
        vehicleDeletes++;
      }
    }
    if (vehicleCreates === 0 && vehicleUpdates === 0 && vehicleDeletes === 0) {
    }

    // --- DOCUMENT TYPES ---
    const allBackendDocTypes = await fetchDocumentTypes(tenantId);
    const backendDocTypeMap = new Map(
      (allBackendDocTypes || []).map(dt => [dt.name.trim().toLowerCase(), dt])
    );
    const entityDocTypeIds: Record<string, { document_type_id: string; is_required: boolean }[]> = {};
    for (const [entityName, localConfig] of Object.entries(configurations)) {
      if (!localConfig?.document_types) continue;
      // Skip winga entity if affiliates module is disabled
      if (entityName === 'winga' && !isModuleEnabled('affiliates')) {
        continue;
      }
      entityDocTypeIds[entityName] = [];
      for (const doc of localConfig.document_types) {
        const docName = doc.name.trim().toLowerCase();
        let backendDoc = allBackendDocTypes.find(
          (d: any) => d.name.trim().toLowerCase() === docName
        );
        if (!backendDoc) {
          const docTypeOption = DOCUMENT_TYPES.find(d => d.name.trim().toLowerCase() === docName);
          const createdDoc = await createDocumentType(tenantId, {
            name: docTypeOption ? docTypeOption.name : doc.name,
            description: docTypeOption ? docTypeOption.description || '' : doc.description,
            metadata: docTypeOption ? { slug: docTypeOption.slug } : doc.metadata,
          });
          if (createdDoc && createdDoc.document_id) {
            backendDoc = createdDoc;
            allBackendDocTypes.push(createdDoc);
          } else {
            continue;
          }
        }
        if (!backendDoc.document_id) {
          continue;
        }
        entityDocTypeIds[entityName].push({
          document_type_id: backendDoc.document_id,
          is_required: doc.is_required,
        });
      }
    }

    // --- ENTITIES ---
    const backendEntities = await fetchEntities(tenantId);
    for (const [entityName, localConfig] of Object.entries(configurations)) {
      if (!entityDocTypeIds[entityName]) continue;
      // Skip winga entity if affiliates module is disabled
      if (entityName === 'winga' && !isModuleEnabled('affiliates')) {
        continue;
      }
      const payload = { tenant_id: tenantId, document_types: entityDocTypeIds[entityName] };
      const backendEntity = backendEntities.find(
        (be: any) => be.name && be.name.trim().toLowerCase() === entityName.trim().toLowerCase()
      );
      const mode = backendEntity ? 'update' : 'create';
      try {
        await saveEntityConfiguration(entityName, tenantId, payload, mode);
      } catch (err) {
        // Continue saving other configurations even if one fails
      }
    }
    toast.success('All configurations saved successfully!');
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
    toast.error(`Failed to save configurations: ${errorMessage}`);
  }
}
