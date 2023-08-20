abstract class FormApplication<
    Options extends FormApplicationOptions = FormApplicationOptions,
    ConcreteObject = unknown
> extends Application<Options> {
    /**
     * @param object  - Some object or entity which is the target to be updated.
     * @param options - Additional options which modify the rendering of the sheet.
     *                  (default: `{}`)
     * @remarks Foundry allows passing no value to the constructor at all.
     */
    constructor(object: ConcreteObject, options?: Partial<Options>);
    constructor(
        ...args: ConcreteObject extends undefined
            ? [ConcreteObject?, Partial<Options>?]
            : [ConcreteObject, Partial<Options>?]
    );

    /**
     * The object target which we are using this form to modify
     */
    object: ConcreteObject;

    /**
     * A convenience reference to the form HTLMElement
     * @defaultValue `null`
     */
    form: HTMLElement | null;

    /**
     * Keep track of any FilePicker instances which are associated with this form
     * The values of this Array are inner-objects with references to the FilePicker instances and other metadata
     * @defaultValue `[]`
     */
    filepickers: FilePicker[];

    /**
     * Keep track of any mce editors which may be active as part of this form
     * The values of this Array are inner-objects with references to the MCE editor and other metadata
     * @defaultValue `{}`
     */
    editors: Record<string, FormApplication.FormApplicationEditor>;

    /**
     * Assign the default options which are supported by the entity edit sheet.
     * @returns The default options for this FormApplication class
     * @see {@link Application.defaultOptions}
     * @defaultValue
     * ```typescript
     * foundry.utils.mergeObject(super.defaultOptions, {
     *   classes: ["form"],
     *   closeOnSubmit: true,
     *   editable: true,
     *   sheetConfig: false,
     *   submitOnChange: false,
     *   submitOnClose: false
     * });
     * ```
     */
    static override get defaultOptions(): FormApplicationOptions;

    /**
     * Is the Form Application currently editable?
     */
    get isEditable(): boolean;

    /**
     * @param options - (default: `{}`)
     */
    override getData(options?: Partial<Options>): MaybePromise<object>;

    protected override _render(force?: boolean, options?: Application.RenderOptions<Options>): Promise<void>;

    protected override _renderInner(data: object): Promise<JQuery>;

    protected override _activateCoreListeners(html: JQuery): void;

    override activateListeners(html: JQuery): void;

    /**
     * If the form is not editable, disable its input fields
     * @param form - The form HTML
     */
    protected _disableFields(form: HTMLElement): void;

    /**
     * Handle standard form submission steps
     * @param event         - The submit event which triggered this handler
     * @param updateData    - Additional specific data keys/values which override or extend the contents of
     *                        the parsed form. This can be used to update other flags or data fields at the
     *                        same time as processing a form submission to avoid multiple database operations.
     *                        (default: `null`)
     * @param preventClose  - Override the standard behavior of whether to close the form on submit
     *                        (default: `false`)
     * @param preventRender - Prevent the application from re-rendering as a result of form submission
     *                        (default: `false`)
     * @returns A promise which resolves to the validated update data
     */
    protected _onSubmit(
        event: Event,
        { updateData, preventClose, preventRender }?: FormApplication.OnSubmitOptions
    ): Promise<Partial<Record<string, unknown>>>;

    /**
     * Get an object of update data used to update the form's target object
     * @param updateData - Additional data that should be merged with the form data
     *                     (default: `{}`)
     * @returns The prepared update data
     */
    // TODO: Maybe we can calculate how the flattened `updateData` looks like, then it would be Partial<Record<string, unknown>> & Flattened<T>
    protected _getSubmitData(updateData?: object | null): Record<string, unknown>;

    /**
     * Handle changes to an input element, submitting the form if options.submitOnChange is true.
     * Do not preventDefault in this handler as other interactions on the form may also be occurring.
     * @param event - The initial change event
     */
    protected _onChangeInput(event: JQuery.ChangeEvent): void;

    /**
     * Handle the change of a color picker input which enters it's chosen value into a related input field
     * @param event - The color picker change event
     */
    protected _onChangeColorPicker(event: JQuery.ChangeEvent): void;

    /**
     * Handle changes to a range type input by propagating those changes to the sibling range-value element
     * @param event - The initial change event
     */
    protected _onChangeRange(event: JQuery.ChangeEvent): void;

    /**
     * Additional handling which should trigger when a FilePicker contained within this FormApplication is submitted.
     * @param selection  - The target path which was selected
     * @param filePicker - The FilePicker instance which was submitted
     */
    protected _onSelectFile(selection: string, filePicker: FilePicker): void;

    /**
     * This method is called upon form submission after form data is validated
     * @param event    - The initial triggering submission event
     * @param formData - The object of validated form data with which to update the object
     * @returns A Promise which resolves once the update operation has completed
     */
    protected abstract _updateObject(event: Event, formData?: object): Promise<unknown>;

    /**
     * Activate a named TinyMCE text editor
     * @param name           - The named data field which the editor modifies.
     * @param options        - Editor initialization options passed to {@link TextEditor.create}.
     *                         (default: `{}`)
     * @param initialContent - Initial text content for the editor area.
     *                         (default: `""`)
     */
    activateEditor(
        name: string,
        options?: TextEditor.Options,
        initialContent?: string
    ): Promise<tinyMCE.Editor | EditorView>;

    /**
     * Handle saving the content of a specific editor by name
     * @param name   - The named editor to save
     * @param remove - Remove the editor after saving its content
     *                 (default: `true`)
     */
    saveEditor(name: string, { remove }?: { remove?: boolean }): Promise<void>;

    /**
     * Activate an editor instance present within the form
     * @param div - The element which contains the editor
     */
    protected _activateEditor(div: HTMLElement): void;

    /**
     * Configure ProseMirror plugins for this sheet.
     * @param name    - The name of the editor.
     * @param options - Additional options to configure the plugins.
     */
    protected _configureProseMirrorPlugins(
        name: string,
        options: {
            /** Whether the editor should destroy itself on save. */
            remove: boolean;
        }
    ): {
        menu: ReturnType<typeof ProseMirrorMenu["build"]>;
        keyMaps: ReturnType<typeof ProseMirrorKeyMaps["build"]>;
    };

    /**
     * Activate a FilePicker instance present within the form
     * @param event - The mouse click event on a file picker activation button
     */
    protected _activateFilePicker(event: PointerEvent): void;

    /**
     * Determine the configuration options used to initialize a FilePicker instance within this FormApplication.
     * Subclasses can extend this method to customize the behavior of pickers within their form.
     * @param event - The initiating mouse click event which opens the picker
     * @returns Options passed to the FilePicker constructor
     */
    protected _getFilePickerOptions(event: PointerEvent): FilePickerOptions;

    /**
     * @param options - (default: `{}`)
     */
    override close(options?: FormApplication.CloseOptions): Promise<void>;

    /**
     * Submit the contents of a Form Application, processing its content as defined by the Application
     * @param options - Options passed to the _onSubmit event handler
     *                  (default: `{}`)
     * @returns Return a self-reference for convenient method chaining
     */
    submit(options?: FormApplication.OnSubmitOptions): Promise<this> | void;
}
