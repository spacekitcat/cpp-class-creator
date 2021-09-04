// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';


async function create_name_input()
{
	var option: vscode.InputBoxOptions = {
		ignoreFocusOut: false,
		placeHolder: "foo it in the bar.",
		prompt: "Type your class name"
	};
	return vscode.window.showInputBox(option);
}

async function create_path_input()
{
	var option: vscode.InputBoxOptions = {
		ignoreFocusOut: false,
		placeHolder: "Give me your path.",
		prompt: "Type a valid path"
	};
	return await vscode.window.showInputBox(option);
}

function create_hpp_buffer(name: string)
{


	const ifndef_head = 
	`#ifndef `+name.toUpperCase()+`_H
#define `+name.toUpperCase()+`_H`;


	const pragma_once_buffer =
	`
#pragma once`;

	const default_info = `
	
class ` + name +`  
{
	private:

	public:

		`+ name +`();
		~`+name+`();

};`;

	const ifndef_end= `
#endif`;

	var output : string;
	const useIfnDef : boolean = vscode.workspace.getConfiguration().get("cpp.creator.headerProtection.useIfnDef") as boolean;
	const usePragma : boolean = vscode.workspace.getConfiguration().get("cpp.creator.headerProtection.usePragmaOnce") as boolean;

	if(useIfnDef && usePragma)
	{
		output = ifndef_head+pragma_once_buffer+default_info+ifndef_end;
	}
	else if(useIfnDef)
	{
		output = ifndef_head+default_info+ifndef_end;		
	}
	else if(usePragma)
	{
		output = pragma_once_buffer+default_info;
	}
	else
	{
		output = default_info;
	}

	return output;
}

function get_include_name(name: string)
{
	var include_name: string;
	if (vscode.workspace.getConfiguration().get("cpp.creator.useHPPEnding") as boolean === true)
	{
		include_name = name + '.hpp';
	}
	else 
	{
		include_name = name + '.h';
	}
	
	return include_name;
}

function create_hpp(className: string, fileName: string, dir: string)
{
	var hpp_buffer = create_hpp_buffer(className);
	var hpp_name = dir+"/"+get_include_name(fileName);
	fs.writeFile(hpp_name, hpp_buffer, function (err)
	{
		if (err) {
			console.error(err);
			return false;
		}
	});


	return true;
}

function create_cpp_buffer(className: string, fileName: string)
{
	var hpp_name = get_include_name(fileName);
	var cpp_buffer =
	`#include "` + hpp_name + `"  
	
`+className+`::`+ className +`()
{
	
}
	
`+className+`::~`+ className + `()
{
	
}`;

	return cpp_buffer;
}

function create_cpp(className: string, fileName: string, dir: string)
{
	var cpp_buffer = create_cpp_buffer(className, fileName);
	var cpp_name = dir+"/"+fileName + '.cpp';
	fs.writeFile(cpp_name, cpp_buffer, function (err)
	{
		if (err) {
			console.error(err);
			return false;
		}
	});

	return true;
}

function create_class(className: string, fileName: string, dir: string)
{
	if (fs.existsSync(dir)) {
		var stats = fs.lstatSync(dir);

		if (!stats.isDirectory()) {
			return false; // if the give directory path, isnt a directory, you cant create a class
		}
	}
	else
		fs.mkdirSync(dir); // if the path doesnt exist, just create the directory

	var hpp = create_hpp(className, fileName, dir);
	var cpp = create_cpp(className, fileName, dir);

	return (hpp && cpp);
}

function can_continue(res: any)
{
	if (!res)
	{
		vscode.window.showErrorMessage("Your Class could not be created!");
		return false;
	}
	else if (res.length > 60)
	{
		vscode.window.showErrorMessage("Class name to long!");
		return false;
	}
	else if (res.indexOf(' ') >= 0)
	{
		vscode.window.showErrorMessage("Class name should not have spaces!");
		return false;
	}
	return true;
}

function format_kebab_case(name: String): String
{
	return name.replace(/[A-Z]+/g, "-$&").slice(1).toLowerCase();
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "cpp-class-creator" is now active!');

	let disposable = vscode.commands.registerCommand('extension.createClass', async (args) => {
		// The code you place here will be executed every time your command is executed

		var className = await create_name_input();
			if(!can_continue(className)) return; // check for class name

			let dir :string | undefined | boolean= vscode.workspace.getConfiguration().get("cpp.creator.setPath");
			// If it's called via the context menu, it's gonna have the _fsPath set from where you're clicking
			if (args != null && args._fsPath != null) {
				dir = args._fsPath;
				if (typeof dir === "string" && fs.existsSync(dir)) {
					var stats = fs.lstatSync(dir);
					if (!stats.isDirectory()) {
						//If it's not a directory then it's the file so get the parent directory
						dir = path.dirname(args._fsPath);
					}
				}
			}
			if (dir == null || dir == false) {
				dir = vscode.workspace.rootPath as string; // use workspace path
				let createFolder: boolean | undefined = vscode.workspace.getConfiguration().get("cpp.creator.createFolder");
				if (createFolder) // create the folder where to put the class
					dir += "/" + className;
			}
			else if (dir == true)
			{
				dir = await create_path_input(); // ask for path
				if (!dir)
				{
					dir = vscode.workspace.rootPath as string; // if empty input, just use workspace path
				}
			}
			let fileName = className as String
			if (vscode.workspace.getConfiguration().get("cpp.creator.file.namingScheme") === 'KebabCase') {
				fileName = format_kebab_case(fileName);
			}
			var out = create_class(className as string, fileName as string, dir as string); // if setPath was neither false, null or true, it was a string, so maybe a valid path? 
																  //Create the class there
			if (out)
			{
					vscode.window.showInformationMessage('Your Class ' + className + '  has been created!');
			}
			else
			{
				vscode.window.showErrorMessage('Your Class ' + className + '  has been not created!');
			}
		});
		// Display a message box to the user

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
