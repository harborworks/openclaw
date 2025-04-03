import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "react-oidc-context";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import * as z from "zod";
import { createJobForOrg } from "../../api/jobs";
import { UserMembership } from "../../api/self";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/ui/form";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";

// Form validation schema
const formSchema = z.object({
  name: z.string().min(3, "Job name must be at least 3 characters"),
  instructions: z.string().optional(),
  dataType: z.enum(["image", "video"]),
  tagType: z.enum(["bounding_box", "category", "time_segments"]),
  labels: z.array(z.string()).min(1, "At least one label is required"),
  urlsFile: z.instanceof(File).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateJobPageProps {
  memberships: UserMembership[];
}

export default function CreateJobPage({ memberships }: CreateJobPageProps) {
  const navigate = useNavigate();
  const auth = useAuth();
  const [newLabel, setNewLabel] = useState("");
  const [validationError, setValidationError] = useState("");
  const [jsonlPreview, setJsonlPreview] = useState<Array<{ url: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract organizations from memberships
  const orgs = memberships.map((membership) => ({
    id: membership.id,
    slug: membership.slug,
    createdAt: membership.createdAt,
    updatedAt: membership.updatedAt,
    isAdmin: membership.isAdmin,
  }));

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      instructions: "",
      dataType: "image",
      tagType: "bounding_box",
      labels: [],
    },
  });

  const { control, formState, handleSubmit, watch, setValue } = form;
  const dataType = watch("dataType");
  const tagType = watch("tagType");
  const labels = watch("labels");

  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);

      // Check for auth and token
      const token = auth.user?.access_token;
      if (!token) {
        toast.error("You must be logged in to create a job");
        setIsSubmitting(false);
        return;
      }

      // Check if we have an organization to create the job in
      if (orgs.length === 0) {
        toast.error("You don't have access to any organizations");
        setIsSubmitting(false);
        return;
      }

      // Use the first org for now - in a real app, you might add an org selector
      const orgId = orgs[0].id;

      // Show warning if using fallback organization
      if (orgs[0].slug === "default-org") {
        toast.warning("Using default organization for development", {
          duration: 3000,
        });
      }

      // First, create the job
      const jobData = {
        name: data.name,
        instructions: data.instructions || "",
        dataType: data.dataType,
        tagType: data.tagType,
        labels: data.labels,
      };

      const job = await createJobForOrg(token, orgId, jobData);

      // If we have a file, read it and create tasks for the job
      if (data.urlsFile) {
        const reader = new FileReader();

        reader.onload = async (event) => {
          try {
            const content = event.target?.result as string;
            const lines = content.trim().split("\n");

            // Process each line as a task
            let successCount = 0;
            let errorCount = 0;

            // Create tasks sequentially to avoid overwhelming the server
            for (const line of lines) {
              try {
                const item = JSON.parse(line);

                if (!item.url) {
                  errorCount++;
                  continue;
                }

                // Create task through API
                await fetch(
                  `${import.meta.env.VITE_API_URL}/api/jobs/${job.id}/tasks`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ url: item.url }),
                  }
                );

                successCount++;
              } catch (err) {
                errorCount++;
              }
            }

            if (errorCount > 0) {
              toast.warning(
                `Created job with ${successCount} tasks, but ${errorCount} tasks failed`
              );
            } else {
              toast.success(`Created job with ${successCount} tasks`);
            }

            // Navigate to jobs page regardless of task creation status
            navigate("/jobs");
          } catch (error) {
            console.error("Error processing file:", error);
            toast.error("Error processing JSONL file");
            // Job was created but tasks failed, so still navigate to jobs
            navigate("/jobs");
          }
        };

        reader.onerror = () => {
          toast.error("Error reading file");
          // Job was created but tasks failed, so still navigate
          navigate("/jobs");
        };

        reader.readAsText(data.urlsFile);
      } else {
        // No file, just show success for the job creation
        toast.success("Job created successfully");
        navigate("/jobs");
      }
    } catch (error) {
      console.error("Error creating job:", error);
      toast.error("Failed to create job");
      setIsSubmitting(false);
    }
  };

  const addLabel = () => {
    if (!newLabel.trim()) return;

    // Check for duplicates
    if (labels.includes(newLabel.trim())) {
      setValidationError("This label already exists");
      return;
    }

    setValue("labels", [...labels, newLabel.trim()]);
    setNewLabel("");
    setValidationError("");
  };

  const removeLabel = (labelToRemove: string) => {
    setValue(
      "labels",
      labels.filter((label) => label !== labelToRemove)
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Only accept .jsonl files
    if (!file.name.endsWith(".jsonl")) {
      setValidationError("Please upload a .jsonl file");
      return;
    }

    setValue("urlsFile", file);
    setValidationError("");

    // Read and parse the file to show a preview
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const lines = content.trim().split("\n");
        const parsed = lines.slice(0, 3).map((line) => JSON.parse(line));
        setJsonlPreview(parsed);
      } catch (error) {
        setValidationError("Invalid JSONL format");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="container max-w-3xl mx-auto py-6">
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate("/jobs")}>
          Back to Jobs
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Job</CardTitle>
          <CardDescription>
            Set up a new job for data tagging with specific instructions and
            labels.
          </CardDescription>
          {orgs.length > 0 && (
            <div className="mt-2 text-sm text-muted-foreground flex items-center">
              <span>Organization:</span>
              <Badge variant="outline" className="ml-2">
                {orgs[0].slug}
              </Badge>
            </div>
          )}
        </CardHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Car Detection Project"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="instructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instructions</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Provide detailed instructions for taggers..."
                        className="h-24"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Clear instructions help taggers understand the task
                      requirements.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={control}
                  name="dataType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select data type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="image">Image</SelectItem>
                          <SelectItem value="video">Video</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Type of data to be tagged
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="tagType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tag Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tag type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="bounding_box">
                            Bounding Box
                          </SelectItem>
                          <SelectItem value="category">Category</SelectItem>
                          <SelectItem value="time_segments">
                            Time Segments
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How the content will be tagged
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={control}
                name="labels"
                render={() => (
                  <FormItem>
                    <FormLabel>Labels</FormLabel>
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            placeholder="Add a label..."
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addLabel();
                              }
                            }}
                          />
                        </FormControl>
                        <Button type="button" onClick={addLabel}>
                          Add
                        </Button>
                      </div>

                      {validationError && (
                        <p className="text-sm font-medium text-destructive">
                          {validationError}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {labels.length > 0 ? (
                          labels.map((label, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="px-2 py-1"
                            >
                              {label}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0 ml-1"
                                onClick={() => removeLabel(label)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No labels added yet. Add at least one label for your
                            job.
                          </p>
                        )}
                      </div>
                    </div>
                    <FormDescription>
                      These are the labels that can be assigned to the data.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel htmlFor="urlsFile">Upload URLs File</FormLabel>
                <div className="mt-1">
                  <Input
                    id="urlsFile"
                    type="file"
                    accept=".jsonl"
                    onChange={handleFileChange}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload a .jsonl file with URLs to {dataType} files. Each line
                  should be a JSON object with a "url" field.
                </p>

                {jsonlPreview.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Preview:</h4>
                    <div className="bg-slate-100 p-3 rounded-md">
                      <code className="text-xs block">
                        {jsonlPreview.map((item, i) => (
                          <div key={i}>{JSON.stringify(item)}</div>
                        ))}
                        {jsonlPreview.length < 3 ? "" : "..."}
                      </code>
                    </div>
                  </div>
                )}
              </div>

              {formState.errors.urlsFile && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {formState.errors.urlsFile.message}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>

            <CardFooter className="flex justify-between pt-6 mt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/jobs")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Job"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
