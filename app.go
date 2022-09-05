package hashcatlauncher

import (
	"log"
	"net"
	"os"
	"path/filepath"
	"runtime"

	"github.com/fsnotify/fsnotify"
	"github.com/zserge/lorca"
)

var (
	Version string = "dev"
)

type App struct {
	Server  net.Listener
	UI      lorca.UI
	Watcher *fsnotify.Watcher

	Dir string

	HashcatDir string

	HashesDir       string
	DictionariesDir string
	RulesDir        string
	MasksDir        string

	ExportedDir string

	Hashcat      *Hashcat
	Hashes       []string
	Dictionaries []string
	Rules        []string
	Masks        []string

	Tasks                   map[string]*Task
	TaskAddCallback         func(TaskUpdate)
	TaskUpdateCallback      func(TaskUpdate)
	TaskPreProcessCallback  func(TaskUpdate)
	TaskPostProcessCallback func(TaskUpdate)
	TaskDeleteCallback      func(string)

	WatcherHashcatCallback      func()
	WatcherHashesCallback       func()
	WatcherDictionariesCallback func()
	WatcherRulesCallback        func()
	WatcherMasksCallback        func()

	Settings *Settings
}

func (a *App) Init() error {
	exe, err := os.Executable()
	if err != nil {
		return err
	}

	a.Dir, _ = filepath.Split(exe)

	a.HashcatDir = filepath.Join(a.Dir, "hashcat")
	err = os.MkdirAll(a.HashcatDir, 0o755)
	if err != nil {
		return err
	}

	a.HashesDir = filepath.Join(a.HashcatDir, "hashes")
	err = os.MkdirAll(a.HashesDir, 0o755)
	if err != nil {
		return err
	}

	a.DictionariesDir = filepath.Join(a.HashcatDir, "dictionaries")
	err = os.MkdirAll(a.DictionariesDir, 0o755)
	if err != nil {
		return err
	}

	a.RulesDir = filepath.Join(a.HashcatDir, "rules")
	err = os.MkdirAll(a.RulesDir, 0o755)
	if err != nil {
		return err
	}

	a.MasksDir = filepath.Join(a.HashcatDir, "masks")
	err = os.MkdirAll(a.MasksDir, 0o755)
	if err != nil {
		return err
	}

	a.ExportedDir = filepath.Join(a.Dir, "exported")
	err = os.MkdirAll(a.ExportedDir, 0o755)
	if err != nil {
		return err
	}

	a.Hashcat = &Hashcat{}
	if runtime.GOOS == "windows" {
		a.Hashcat.BinaryFile = filepath.Join(a.HashcatDir, "hashcat.exe")
	} else {
		a.Hashcat.BinaryFile = filepath.Join(a.HashcatDir, "hashcat.bin")
	}

	if err := a.Scan(); err != nil {
		log.Println(err)
	}

	a.Tasks = make(map[string]*Task)
	a.TaskAddCallback = func(taskUpdate TaskUpdate) {
		a.UI.Eval(`eventBus.dispatch("taskUpdate",` + MarshalJSONS(taskUpdate) + `)`)
	}
	a.TaskUpdateCallback = func(taskUpdate TaskUpdate) {
		a.UI.Eval(`eventBus.dispatch("taskUpdate",` + MarshalJSONS(taskUpdate) + `)`)
	}
	a.TaskPreProcessCallback = func(taskUpdate TaskUpdate) {}
	a.TaskPostProcessCallback = func(taskUpdate TaskUpdate) {
		a.UI.Eval(`eventBus.dispatch("taskUpdate",` + MarshalJSONS(taskUpdate) + `)`)
	}
	a.TaskDeleteCallback = func(taskID string) {
		a.UI.Eval(`eventBus.dispatch("taskDelete",` + MarshalJSONS(taskID) + `)`)
	}

	a.WatcherHashcatCallback = func() {
		a.Hashcat.LoadAlgorithms()
		a.UI.Eval(`data.getAlgorithms()`)
	}
	a.WatcherHashesCallback = func() {
		a.ScanHashes()
		a.UI.Eval(`data.getHashes()`)
	}
	a.WatcherDictionariesCallback = func() {
		a.ScanDictionaries()
		a.UI.Eval(`data.getDictionaries()`)
	}
	a.WatcherRulesCallback = func() {
		a.ScanRules()
		a.UI.Eval(`data.getRules()`)
	}
	a.WatcherMasksCallback = func() {
		a.ScanMasks()
		a.UI.Eval(`data.getMasks()`)
	}

	if err := a.LoadSettings(); err != nil {
		log.Println(err)
	}

	if err := a.Bundle(); err != nil {
		log.Println(err)
	}

	return nil
}

func (a *App) Clean() error {
	if err := a.SaveSettings(); err != nil {
		log.Println(err)
	}

	return nil
}

func (a *App) Scan() (err error) {
	a.Hashcat.LoadAlgorithms()

	if err = a.ScanHashes(); err != nil {
		return
	}
	if err = a.ScanDictionaries(); err != nil {
		return
	}
	if err = a.ScanRules(); err != nil {
		return
	}
	if err = a.ScanMasks(); err != nil {
		return
	}

	return
}

func NewApp() *App {
	return &App{}
}
