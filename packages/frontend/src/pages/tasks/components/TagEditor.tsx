import { UseFormReturn } from "react-hook-form";
import { TimeSegmentTag } from "../../../api/jobs";
import { Button } from "../../../components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../../components/ui/form";
import { Input } from "../../../components/ui/input";
import { Slider } from "../../../components/ui/slider";

interface TagEditorProps {
  form: UseFormReturn<any>;
  onSubmit: (values: any) => void;
  editingTag: TimeSegmentTag | null;
  setShowTagEditor: (show: boolean) => void;
  setEditingTag: (tag: TimeSegmentTag | null) => void;
  isSavingTag: boolean;
  percentToSeconds: (percent: number) => number;
  setStartFromVideo: () => void;
  setEndFromVideo: () => void;
  handleTimeRangeChange: (values: number[]) => void;
  formatTime: (seconds: number) => string;
  seekVideoToTime: (seconds: number) => void;
  jobLabels: string[];
}

export default function TagEditor({
  form,
  onSubmit,
  editingTag,
  setShowTagEditor,
  setEditingTag,
  isSavingTag,
  percentToSeconds,
  setStartFromVideo,
  setEndFromVideo,
  handleTimeRangeChange,
  formatTime,
  seekVideoToTime,
  jobLabels,
}: TagEditorProps) {
  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border p-4 w-[400px] z-10">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium">
          {editingTag ? "Edit Time Segment Tag" : "Create Time Segment Tag"}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setShowTagEditor(false);
            setEditingTag(null);
            form.reset();
          }}
          className="h-8 w-8 p-0"
        >
          <span className="sr-only">Close</span>✕
        </Button>
      </div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit as any)}
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="timeRange"
            render={({ field }) => (
              <FormItem className="space-y-4">
                <FormLabel>Time Range</FormLabel>
                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={setStartFromVideo}
                  >
                    Set Start to Current
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={setEndFromVideo}
                  >
                    Set End to Current
                  </Button>
                </div>
                <div className="pt-4">
                  <Slider
                    defaultValue={field.value}
                    max={100}
                    step={0.1}
                    value={field.value}
                    onValueChange={(values) => {
                      field.onChange(values);
                      handleTimeRangeChange(values);
                    }}
                    className="mb-2"
                  />
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <div>
                    Start: {formatTime(percentToSeconds(field.value[0]))}
                  </div>
                  <div>End: {formatTime(percentToSeconds(field.value[1]))}</div>
                </div>
                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      seekVideoToTime(percentToSeconds(field.value[0]))
                    }
                  >
                    Jump to Start
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      seekVideoToTime(percentToSeconds(field.value[1]))
                    }
                  >
                    Jump to End
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="label"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Label</FormLabel>
                {jobLabels.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {jobLabels.map((label) => (
                      <Button
                        key={label}
                        type="button"
                        variant={field.value === label ? "default" : "outline"}
                        onClick={() => field.onChange(label)}
                        className="justify-start"
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <FormControl>
                    <Input placeholder="Enter tag label" {...field} />
                  </FormControl>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowTagEditor(false);
                setEditingTag(null);
                form.reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSavingTag}>
              {isSavingTag
                ? editingTag
                  ? "Updating..."
                  : "Creating..."
                : editingTag
                  ? "Update Tag"
                  : "Create Tag"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
