"use client";

import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormLabel,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, Loader2, CheckCircle2, Info } from "lucide-react";
import { useState, useTransition } from "react";
import Confetti from "react-confetti";
import { createCoursePackage } from "@/actions/admin/creatingCoursesPackage"; // ✅ Import server action

const formSchema = z.object({
  name: z.string().min(1, {
    message: "Name is required",
  }),
});

const CreatePage = () => {
  const router = useRouter();
  const [success, setSuccess] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  const lang = "en";

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    startTransition(async () => {
      const result = await createCoursePackage(values.name);

      if (result) {
        setSuccess(true);
        toast.success("Course Package created successfully");
        setTimeout(() => {
          router.push(`/${lang}/admin/coursesPackages/${result.id}`);
        }, 1800);
      } else {
        toast.error(result || "Something went wrong");
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
      {success && <Confetti numberOfPieces={200} recycle={false} />}

      <Link
        href={`/${lang}/admin/coursesPackages`}
        className="focus-ring mb-6 inline-flex items-center gap-2 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Course Packages
      </Link>

      <div className="surface animate-rise-in p-6 shadow-lg sm:p-8">
        {success ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 grid size-16 place-items-center rounded-full bg-success/12">
              <CheckCircle2 className="size-8 text-success-tint-fg" />
            </div>
            <h2 className="mb-1 text-2xl font-bold">Success</h2>
            <p className="mb-1 text-sm text-muted-foreground">
              Your course package has been created.
            </p>
            <span className="text-xs text-muted-foreground">Redirecting…</span>
          </div>
        ) : (
          <>
            <h1 className="mb-1.5 text-2xl font-bold tracking-tight">
              Name your course package
            </h1>
            <p className="mb-7 text-sm text-muted-foreground">
              What would you like to call it? You can change this later.
            </p>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-7"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-1.5">
                        <FormLabel>Course package name</FormLabel>
                        <span
                          onMouseEnter={() => setShowTooltip(true)}
                          onMouseLeave={() => setShowTooltip(false)}
                          className="relative cursor-help"
                        >
                          <Info className="size-3.5 text-muted-foreground" />
                          {showTooltip && (
                            <span className="absolute left-5 top-0 z-10 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md">
                              Choose a clear, descriptive name
                            </span>
                          )}
                        </span>
                      </div>
                      <FormControl>
                        <Input
                          disabled={isPending}
                          placeholder="e.g. 'Programming Languages'"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        What courses will you teach in this package?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    disabled={!form.formState.isValid || isPending}
                  >
                    {isPending && <Loader2 className="size-4 animate-spin" />}
                    {isPending ? "Creating…" : "Continue"}
                  </Button>
                  <Link href={`/${lang}/admin/coursesPackages`}>
                    <Button type="button" variant="ghost">
                      Cancel
                    </Button>
                  </Link>
                </div>
              </form>
            </Form>
          </>
        )}
      </div>
    </div>
  );
};

export default CreatePage;
