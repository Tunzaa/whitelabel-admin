"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  Libraries,
} from '@react-google-maps/api';
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from 'use-places-autocomplete';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, LocateFixed } from 'lucide-react';
import { cn } from '@/lib/utils';

const libraries: Libraries = ['places'];

interface MapPickerProps {
  value?: [number, number] | null;
  onChange: (value: [number, number] | null) => void;
  onAddressFound?: (address: {
    address_line1?: string;
    city?: string;
    state_province?: string;
    postal_code?: string;
    country?: string;
  }) => void;
  className?: string;
  defaultCenter?: [number, number];
  zoom?: number;
  height?: string;
  width?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

async function reverseGeocode(lat: number, lng: number) {
  try {
    const geocoder = new window.google.maps.Geocoder();
    const { results } = await geocoder.geocode({ location: { lat, lng } });

    if (results && results[0]) {
      const addressComponents = results[0].address_components;
      const getAddressComponent = (type: string) =>
        addressComponents.find(c => c.types.includes(type))?.long_name || '';

      return {
        address_line1: results[0].formatted_address,
        city: getAddressComponent('locality'),
        state_province: getAddressComponent('administrative_area_level_1'),
        postal_code: getAddressComponent('postal_code'),
        country: getAddressComponent('country'),
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

export function MapPicker({
  value,
  onChange,
  onAddressFound,
  className,
  defaultCenter = [-6.8235, 39.2695],
  zoom = 13,
  height = '300px',
  width = '100%',
  disabled = false,
  readOnly = false,
}: MapPickerProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [position, setPosition] = useState<google.maps.LatLngLiteral | null>(
    value ? { lat: value[0], lng: value[1] } : null
  );
  const mapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    if (value) {
      setPosition({ lat: value[0], lng: value[1] });
    } else {
      setPosition(null);
    }
  }, [value]);

  const handlePositionChange = useCallback(
    async (latLng: google.maps.LatLng) => {
      if (disabled || readOnly) return;

      const newPos = { lat: latLng.lat(), lng: latLng.lng() };
      setPosition(newPos);
      onChange([newPos.lat, newPos.lng]);

      if (onAddressFound) {
        const addressData = await reverseGeocode(newPos.lat, newPos.lng);
        if (addressData) {
          onAddressFound(addressData);
        }
      }
    },
    [disabled, readOnly, onChange, onAddressFound]
  );

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        handlePositionChange(e.latLng);
      }
    },
    [handlePositionChange]
  );

  const handleClear = () => {
    if (disabled || readOnly) return;
    setPosition(null);
    onChange(null);
  };

  const handleUseCurrentLocation = () => {
    if (disabled || readOnly) return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const latLng = new window.google.maps.LatLng(
            position.coords.latitude,
            position.coords.longitude
          );
          handlePositionChange(latLng);
          mapRef.current?.panTo(latLng);
          mapRef.current?.setZoom(15);
        },
        () => alert('Error: The Geolocation service failed.'),
        { enableHighAccuracy: true }
      );
    } else {
      alert("Error: Your browser doesn't support geolocation.");
    }
  };

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  if (loadError) return <div>Error loading maps. Make sure you have set the Google Maps API key.</div>;
  if (!isLoaded) return <div>Loading...</div>;

  return (
    <div className={cn('space-y-2', className)} style={{ width }}>
      {!readOnly && (
        <PlacesAutocomplete
          onSelect={handlePositionChange}
          mapRef={mapRef}
          disabled={disabled}
        />
      )}
      <div style={{ height, width, position: 'relative' }}>
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%', borderRadius: '0.5rem' }}
          center={position || { lat: defaultCenter[0], lng: defaultCenter[1] }}
          zoom={position ? 15 : zoom}
          onLoad={onMapLoad}
          onClick={handleMapClick}
          options={{
            disableDefaultUI: true,
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          }}
        >
          {position && <Marker position={position} />}
        </GoogleMap>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!readOnly && (
          <Button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={disabled}
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
          >
            <LocateFixed className="h-4 w-4" />
            Use Current Location
          </Button>
        )}
        {position && (
          <Button
            type="button"
            onClick={handleClear}
            disabled={disabled || readOnly}
            variant="destructive"
            size="sm"
            className="flex items-center gap-1"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>
      {position && (
        <div className="text-sm text-gray-500">
          Lat: {position.lat.toFixed(6)}, Lng: {position.lng.toFixed(6)}
        </div>
      )}
    </div>
  );
}

function PlacesAutocomplete({
  onSelect,
  mapRef,
  disabled,
}: {
  onSelect: (latLng: google.maps.LatLng) => void;
  mapRef: React.RefObject<google.maps.Map | null>;
  disabled?: boolean;
}) {
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {},
    debounce: 300,
  });

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const handleSelect = async (address: string) => {
    setValue(address, false);
    clearSuggestions();

    try {
      const results = await getGeocode({ address });
      const latLng = await getLatLng(results[0]);
      const googleLatLng = new window.google.maps.LatLng(latLng.lat, latLng.lng);
      onSelect(googleLatLng);
      mapRef.current?.panTo(googleLatLng);
      mapRef.current?.setZoom(15);
    } catch (error) {
    }
  };

  return (
    <div className="relative w-full">
      <Input
        value={value}
        onChange={handleInput}
        disabled={!ready || disabled}
        placeholder="Search for a location..."
        className="w-full"
      />
      {status === 'OK' && (
        <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-md mt-1 shadow-lg">
          {data.map(({ place_id, description }) => (
            <li
              key={place_id}
              onClick={() => handleSelect(description)}
              className="p-2 hover:bg-gray-100 cursor-pointer"
            >
              {description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
