"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const MIN_DOB = new Date(1900, 0, 1);
const MAX_DOB = new Date();

const formSchema = z.object({
  dob: z.date({ error: "Enter your date of birth." }).max(MAX_DOB, {
    message: "That date hasn't happened yet.",
  }),
  tosAccepted: z.literal(true, {
    error: "You must accept the Terms and Privacy Policy to continue.",
  }),
});

type FormValues = z.infer<typeof formSchema>;

export function AgeGateForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { tosAccepted: undefined },
  });

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    try {
      const res = await fetch("/api/age-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dob: format(values.dob, "yyyy-MM-dd"),
          tosAccepted: values.tosAccepted,
        }),
      });

      if (!res.ok) {
        setSubmitError("Something went wrong. Please try again.");
        return;
      }

      const data = (await res.json()) as { blocked: boolean };
      router.push(data.blocked ? "/blocked" : "/");
      router.refresh();
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="dob">Date of birth</FieldLabel>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="dob"
                type="button"
                variant="outline"
                className="w-full justify-start font-normal"
              >
                <CalendarIcon className="mr-2 size-4" />
                {form.watch("dob")
                  ? format(form.watch("dob"), "PPP")
                  : "Select a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                captionLayout="dropdown"
                startMonth={MIN_DOB}
                endMonth={MAX_DOB}
                selected={form.watch("dob")}
                onSelect={(date) =>
                  form.setValue("dob", date as Date, {
                    shouldValidate: true,
                  })
                }
                disabled={{ after: MAX_DOB, before: MIN_DOB }}
              />
            </PopoverContent>
          </Popover>
          <FieldDescription>
            You must be 18 or older to use SinusFlirt.
          </FieldDescription>
          <FieldError errors={[form.formState.errors.dob]} />
        </Field>

        <Field orientation="horizontal">
          <Checkbox
            id="tosAccepted"
            checked={form.watch("tosAccepted") === true}
            onCheckedChange={(checked) =>
              form.setValue("tosAccepted", checked === true ? true : (undefined as never), {
                shouldValidate: true,
              })
            }
          />
          <FieldLabel htmlFor="tosAccepted" className="font-normal">
            I agree to the{" "}
            <a href="/legal/terms" className="underline underline-offset-4">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/legal/privacy" className="underline underline-offset-4">
              Privacy Policy
            </a>
            .
          </FieldLabel>
        </Field>
        <FieldError errors={[form.formState.errors.tosAccepted]} />

        {submitError && (
          <p role="alert" className="text-sm text-destructive">
            {submitError}
          </p>
        )}

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Checking..." : "Continue"}
        </Button>
      </FieldGroup>
    </form>
  );
}
