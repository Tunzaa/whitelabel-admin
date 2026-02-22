"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash, Plus, GripVertical } from "lucide-react";
import { FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";
import { Spinner } from "@/components/ui/spinner";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from "@/lib/utils";

// Generic banner type that can be used across different components
export interface Banner {
  id?: string;
  title: string;
  image_url: string;
  alt_text?: string;
  is_active?: boolean;
  [key: string]: any; // Allow for any additional fields
}

interface BannerEditorProps {
  banners: Banner[];
  onChange: (banners: Banner[]) => void;
  resourceId?: string;
  entityId?: string;
  readOnly?: boolean;
  className?: string;
  title?: string;
  infoContent?: string;
  onDeleteBanner?: (resourceId: string, bannerId: string) => Promise<void>;
  onUpdateResource?: (resourceId: string, entityId: string, data: any) => Promise<void>;
  disableDragAndDrop?: boolean;
}
export function BannerEditor({
  banners = [],
  onChange,
  resourceId,
  entityId,
  title = "Banners",
  infoContent,
  readOnly = false,
  className = "",
  onDeleteBanner,
  onUpdateResource,
  disableDragAndDrop = false,
}: BannerEditorProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Configure sensors for drag and drop with vertical movement constraint
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Minimum drag distance to activate
        tolerance: { // Only consider vertical movements
          x: 100000, // Large value to ignore horizontal movements
          y: 5, // Small value for vertical sensitivity
        },
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Add a new banner with default values
  const addBanner = () => {
    // Get the highest display_order
    const highestOrder = banners.length > 0 
      ? Math.max(...banners.map(b => b.display_order || 0)) 
      : 0;
    
    const newBanner: Banner = {
      id: `temp-${uuidv4()}`, // Temporary ID for new banners
      title: "",
      image_url: "",
      alt_text: "",
      is_active: true,
      display_order: highestOrder + 1, // Set display_order for new banners
    };
    
    // Add the new banner and update state
    const updatedBanners = [...banners, newBanner];
    onChange(updatedBanners);
    
    // Scroll to the new banner (after a short delay to allow rendering)
    setTimeout(() => {
      const element = document.getElementById(`banner-${banners.length}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  // Remove a banner by index
  const removeBanner = async (index: number, bannerId?: string) => {
    if (isDeleting || isUploading) return;
    
    // Confirm before deleting
    if (!confirm('Are you sure you want to remove this banner?')) {
      return;
    }
    
    try {
      // For API-managed banners, delete on server first
      if (resourceId && bannerId && onDeleteBanner && !bannerId.startsWith('temp-')) {
        setIsDeleting(bannerId);
        try {
          await onDeleteBanner(resourceId, bannerId);
          toast.success("Banner removed successfully");
        } catch (error) {
          toast.error("Failed to remove banner");
          return; // Exit early without removing from local state
        } finally {
          setIsDeleting(null);
        }
      }
      
      // Remove from local state
      const newBanners = [...banners];
      newBanners.splice(index, 1);
      
      // Reorder display_order for remaining banners
      const updatedBanners = newBanners.map((banner, idx) => ({
        ...banner,
        display_order: idx + 1,
      }));
      
      onChange(updatedBanners);
      toast.success("Banner removed");
    } catch (error) {
      toast.error("An error occurred while removing the banner");
      setIsDeleting(null);
    }
  };

  // Update a banner field by index
  const updateBanner = (index: number, field: string, value: any) => {
    // Prevent saving temporary blob URLs from ImageUpload preview
    if (field === 'image_url' && typeof value === 'string' && value.startsWith('blob:')) {
      return;
    }
    const updatedBanners = [...banners];
    
    // Special handling for display_order changes
    if (field === 'display_order') {
      // Store the old and new order values
      const oldOrder = updatedBanners[index].display_order || index + 1;
      const newOrder = value;
      
      // If we're changing the display order, we need to adjust other banners
      updatedBanners.forEach((banner, i) => {
        if (i !== index) {
          const currentOrder = banner.display_order || i + 1;
          
          // If moving up in order (smaller number = earlier position)
          if (newOrder < oldOrder) {
            // Shift down banners that are between the new and old positions
            if (currentOrder >= newOrder && currentOrder < oldOrder) {
              updatedBanners[i] = { ...banner, display_order: currentOrder + 1 };
            }
          } 
          // If moving down in order (larger number = later position)
          else if (newOrder > oldOrder) {
            // Shift up banners that are between the old and new positions
            if (currentOrder <= newOrder && currentOrder > oldOrder) {
              updatedBanners[i] = { ...banner, display_order: currentOrder - 1 };
            }
          }
        }
      });
    }
    
    // Update the target banner with the new value
    updatedBanners[index] = { ...updatedBanners[index], [field]: value };
    
    // If we updated display_order, sort the banners by display_order
    if (field === 'display_order') {
      updatedBanners.sort((a, b) => {
        const aOrder = a.display_order || banners.indexOf(a) + 1;
        const bOrder = b.display_order || banners.indexOf(b) + 1;
        return aOrder - bOrder;
      });
    }
    
    // Notify parent component of the change
    onChange(updatedBanners);
    
    // Log for debugging
  };

  // Handle drag end event for reordering
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = banners.findIndex(
        banner => (banner.id || `banner-${banners.indexOf(banner)}`) === active.id
      );
      const newIndex = banners.findIndex(
        banner => (banner.id || `banner-${banners.indexOf(banner)}`) === over.id
      );
      
      if (oldIndex !== -1 && newIndex !== -1) {
        // Create the reordered array
        const newBanners = arrayMove(banners, oldIndex, newIndex);
        
        // Update the display_order value for each banner
        const updatedBanners = newBanners.map((banner, idx) => ({
          ...banner,
          display_order: idx + 1,
        }));
        
        // Notify of change
        onChange(updatedBanners);
        toast.success("Banner order updated");
      }
    }
  };

  // Update display order after reordering
  useEffect(() => {
    if (banners.some(banner => banner.display_order !== undefined)) {
      const updatedBanners = banners.map((banner, index) => ({
        ...banner,
        display_order: index + 1,
      }));
      onChange(updatedBanners);
    }
  }, []);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium flex items-center gap-2">
          {title}
          {infoContent && <InfoTooltip content={infoContent} />}
        </h3>
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addBanner}
            disabled={isUploading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Banner
          </Button>
        )}
      </div>

      {banners.length === 0 && (
        <div className="text-center py-4 text-muted-foreground bg-gray-50 rounded-md">
          No banners added yet
        </div>
      )}

      <div className="space-y-3 max-h-[1000px] overflow-y-auto pr-2 pb-4">
        {disableDragAndDrop ? (
          // Render banners without drag and drop
          banners.map((banner, index) => (
            <SortableBannerItem
              key={banner.id || `banner-${index}`}
              banner={banner}
              index={index}
              readOnly={readOnly}
              isUploading={isUploading}
              isDeleting={isDeleting}
              onRemove={removeBanner}
              onUpdate={updateBanner}
              onUploadingChange={setIsUploading}
            />
          ))
        ) : (
          // Render with drag and drop
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={banners.map((banner, index) => banner.id || `banner-${index}`)}
              strategy={verticalListSortingStrategy}
            >
              {banners.map((banner, index) => (
                <div id={`banner-${index}`} className="relative py-1">
                  <SortableBannerItem
                    key={banner.id || `banner-${index}`}
                    banner={banner}
                    index={index}
                    readOnly={readOnly}
                    isUploading={false} // Since ImageUpload handles its own state
                    isDeleting={isDeleting}
                    onRemove={removeBanner}
                    onUpdate={updateBanner}
                    onUploadingChange={setIsUploading}
                  />
                  {index < banners.length - 1 && (
                    <div className="w-full h-[2px] bg-gray-100 mt-3"></div>
                  )}
                </div>
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}

// Sortable Banner Item component using dnd-kit
function SortableBannerItem({
  banner,
  index,
  readOnly,
  isUploading,
  isDeleting,
  onRemove,
  onUpdate,
  onUploadingChange,
}: {
  banner: Banner;
  index: number;
  readOnly: boolean;
  isUploading: boolean;
  isDeleting: string | null;
  onRemove: (index: number, bannerId?: string) => void;
  onUpdate: (index: number, field: string, value: any) => void;
  onUploadingChange: (isUploading: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({id: banner.id || `banner-${index}`});
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="relative"
    >
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {!readOnly && (
              <button 
                type="button" 
                className="cursor-grab touch-manipulation hover:bg-gray-100 p-1 rounded transition-colors" 
                {...attributes} 
                {...listeners}
                title="Drag to reorder"
              >
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </button>
            )}
            <h4 className="font-medium flex items-center">
              <span className="bg-primary/10 text-primary rounded-full w-6 h-6 inline-flex items-center justify-center mr-2 text-sm">{index + 1}</span>
              Banner
              {banner.display_order && (
                <span className="ml-2 text-xs text-muted-foreground">(Order: {banner.display_order})</span>
              )}
            </h4>
          </div>
          {!readOnly && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemove(index, banner.id)}
              disabled={isDeleting === banner.id}
              className="hover:bg-red-50 transition-colors"
            >
              {isDeleting === banner.id ? (
                <Spinner size="sm" className="mr-2" />
              ) : (
                <Trash className="h-4 w-4 mr-1 text-red-500" />
              )}
              <span className="text-red-500">Remove</span>
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {/* Banner Image with Height Limit */}
          <div>
            <Label>Banner Image</Label>
            <div className="mt-1">
              <ImageUpload
                id={`banner-image-${index}`}
                value={banner.image_url}
                onChange={(url) => onUpdate(index, "image_url", url)}
                onUploadingChange={onUploadingChange}
                height="h-40"
                width="w-full"
                imgHeight="h-70"
                previewAlt={banner.alt_text || "Banner image"}
                buttonText="Upload Banner"
                className="mb-2 transition-all duration-200 hover:shadow-md"
                readOnly={readOnly}
              />
              {!banner.image_url && (
                <FormMessage>Please upload a banner image</FormMessage>
              )}
            </div>
          </div>

          {/* Banner fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`banner-title-${index}`} className="font-medium">Title</Label>
                <Input
                  id={`banner-title-${index}`}
                  value={banner.title}
                  onChange={(e) => onUpdate(index, "title", e.target.value)}
                  placeholder="Enter banner title"
                  readOnly={readOnly}
                  className="mt-1 transition-all duration-200 focus-visible:ring-primary/50"
                />
              </div>

              <div>
                <Label htmlFor={`banner-alt-${index}`} className="font-medium">Alt Text</Label>
                <Input
                  id={`banner-alt-${index}`}
                  value={banner.alt_text || ""}
                  onChange={(e) => onUpdate(index, "alt_text", e.target.value)}
                  placeholder="Describe this image (for accessibility)"
                  readOnly={readOnly}
                  className="mt-1 transition-all duration-200 focus-visible:ring-primary/50"
                />
              </div>
            </div>
            
            {/* Display Order Field */}
            {/* <div>
              <Label htmlFor={`banner-order-${index}`} className="font-medium">Display Order</Label>
              <Input
                id={`banner-order-${index}`}
                type=""
                value={banner.display_order || index + 1}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value > 0) {
                    onUpdate(index, "display_order", value);
                  }
                }}
                min="1"
                placeholder="Order position"
                readOnly={readOnly}
                className="mt-1 transition-all duration-200 focus-visible:ring-primary/50"
              />
              <p className="text-xs text-muted-foreground mt-1">Banners display in ascending order (lowest first)</p>
            </div> */}
            
            {/* Active Status */}
            <div className="rounded-lg p-3 flex items-center justify-between border p-3 py-4">
              <Label htmlFor={`banner-active-${index}`} className="flex-grow font-medium">Active</Label>
              <Switch
                id={`banner-active-${index}`}
                checked={banner.is_active !== false} // Default to true if undefined
                onCheckedChange={(checked) => onUpdate(index, "is_active", checked)}
                disabled={readOnly}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

