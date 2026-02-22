"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Edit, Trash2, UserPlus } from 'lucide-react';
import { useDeliveryPartnerStore } from '@/features/delivery-partners/store'; // Assuming store will handle drivers
import { toast } from 'sonner';

// Placeholder for Driver type - to be refined based on actual data model
interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  // Add other relevant driver fields
}

interface DriversTabProps {
  partnerId: string;
  tenantId: string;
}

export const DriversTab: React.FC<DriversTabProps> = ({ partnerId, tenantId }) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', licenseNumber: '' });

  // TODO: Fetch drivers from store
  useEffect(() => {
    // Placeholder: fetch drivers associated with partnerId
    // const fetchedDrivers = await store.fetchDriversForPartner(partnerId, { "X-Tenant-ID": tenantId });
    // setDrivers(fetchedDrivers);
    // Example drivers:
    // setDrivers([
    //   { id: 'driver1', name: 'John Doe', phone: '1234567890', licenseNumber: 'LIC123' },
    //   { id: 'driver2', name: 'Jane Smith', phone: '0987654321', licenseNumber: 'LIC456' },
    // ]);
  }, [partnerId, tenantId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenModal = (driver: Driver | null = null) => {
    if (driver) {
      setEditingDriver(driver);
      setFormData({ name: driver.name, phone: driver.phone, licenseNumber: driver.licenseNumber });
    } else {
      setEditingDriver(null);
      setFormData({ name: '', phone: '', licenseNumber: '' });
    }
    setIsModalOpen(true);
  };

  const handleSaveDriver = async () => {
    // TODO: Implement save logic (add/update driver via store)
    const driverData = { ...formData, partnerId };
    try {
      if (editingDriver) {
        // await store.updateDriver(editingDriver.id, driverData, { "X-Tenant-ID": tenantId });
        toast.success('Driver updated successfully (placeholder).');
      } else {
        // await store.addDriver(driverData, { "X-Tenant-ID": tenantId });
        toast.success('Driver added successfully (placeholder).');
      }
      // Refetch drivers or update local state
      setIsModalOpen(false);
    } catch (error) {
      toast.error('Failed to save driver (placeholder).');
    }
  };
  
  const handleDeleteDriver = async (driverId: string) => {
    // TODO: Implement delete logic
    // await store.deleteDriver(driverId, { "X-Tenant-ID": tenantId });
    toast.success('Driver deleted successfully (placeholder).');
    // Refetch drivers or update local state
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Manage Drivers</h3>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenModal()} size="sm">
              <UserPlus className="mr-2 h-4 w-4" /> Add Driver
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingDriver ? 'Edit Driver' : 'Add New Driver'}</DialogTitle>
              <DialogDescription>
                {editingDriver ? 'Update the details of the driver.' : 'Enter the details for the new driver.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleInputChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">Phone</Label>
                <Input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="licenseNumber" className="text-right">License No.</Label>
                <Input id="licenseNumber" name="licenseNumber" value={formData.licenseNumber} onChange={handleInputChange} className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleSaveDriver}>Save Driver</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {drivers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No drivers added yet for this partner.</p>
      ) : (
        <div className="rounded-md border">
          {/* Basic list for now, will replace with a Table component later */}
          <ul className="divide-y divide-gray-200">
            {drivers.map((driver) => (
              <li key={driver.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{driver.name}</p>
                  <p className="text-xs text-gray-500">Phone: {driver.phone} | License: {driver.licenseNumber}</p>
                </div>
                <div className="space-x-2">
                  <Button variant="outline" size="icon" onClick={() => handleOpenModal(driver)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="icon" onClick={() => handleDeleteDriver(driver.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
