"use client";

import { Camera, Palmtree } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface NewEventPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectBooking: () => void;
  onSelectPersonal: () => void;
}

export function NewEventPicker({
  open,
  onOpenChange,
  onSelectBooking,
  onSelectPersonal,
}: NewEventPickerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Add to calendar</DialogTitle>
          <DialogDescription className="sr-only">Choose whether to add a booking or a personal event.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <Button
            variant="outline"
            className="h-20 flex-col gap-2"
            onClick={() => {
              onOpenChange(false);
              onSelectBooking();
            }}
          >
            <Camera className="h-5 w-5" />
            <span className="text-xs">New booking</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex-col gap-2"
            onClick={() => {
              onOpenChange(false);
              onSelectPersonal();
            }}
          >
            <Palmtree className="h-5 w-5" />
            <span className="text-xs">Personal event</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
