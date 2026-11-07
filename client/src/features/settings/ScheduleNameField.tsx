import { defineView } from "@/lib/vue";
import { LIMITS } from "@shared/limits";
export interface ScheduleNameFieldProps {
  id: string;
  value: string;
  label: string;
  placeholder: string;
  onChange: (value: string) => void;
}
export const ScheduleNameField = defineView<ScheduleNameFieldProps>(
  ["id", "value", "label", "placeholder", "onChange"],
  (props, _viewContext) => {
    return () => (
      <div>
        <label
          for={props.id}
          class="text-xs font-bold mb-1 block"
          style={{ color: "var(--dt-text-muted)" }}
        >
          {props.label}
        </label>
        <input
          id={props.id}
          type="text"
          value={props.value}
          onInput={event =>
            props.onChange((event.target as HTMLInputElement).value)
          }
          maxlength={LIMITS.scheduleName}
          class="w-full dt-field px-3 py-2 text-sm font-bold"
          placeholder={props.placeholder}
        />
      </div>
    );
  }
);
